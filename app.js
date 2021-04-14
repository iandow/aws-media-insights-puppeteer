const puppeteer = require('puppeteer');
const ScreenshotTester = require('puppeteer-screenshot-tester')
const { promisify } = require('util')
const sleep = promisify(setTimeout)

let url = process.env.WEBAPP_URL;
let temp_password = process.env.TEMP_PASSWORD;

(async () => {
    const test_screenshot = await ScreenshotTester(0.8, false, false, [], {
        transparency: 0.5
    })

    const test_collection_screenshot = await ScreenshotTester(
      0.1, // threshold
      false, // anti-aliasing
      false, // ignore colors
      {
          ignoreRectangles: [[36, 335, 169, 106], [649, 345, 372, 54], [568, 428, 170, 85] ],
      }, // rectangles
      {
          transparency: 0.5
      }
    )

    const test_screenshot_containing_video = await ScreenshotTester(
      0.1, // threshold
      false, // anti-aliasing
      false, // ignore colors
      {
          ignoreRectangles: [[670, 95, 583, 331], [648, 657, 403, 27]],
      }, // rectangles
      {
          transparency: 0.5
      }
    )

    const test_words_screenshot = await ScreenshotTester(
      0.1, // threshold
      false, // anti-aliasing
      false, // ignore colors
      {
          ignoreRectangles: [[670, 95, 583, 331], [648, 657, 403, 27], [15, 284, 610, 70]],
      }, // rectangles
      {
          transparency: 0.5
      }
    )

    console.log("Loading " + url)
    // Chromium doesn't support video playback, so use Chrome instead
    // const browser = await  puppeteer.launch({executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true})
    const browser = await  puppeteer.launch({executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox']})
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 926 });
    await page.goto(url,  {waitUntil: 'networkidle0'});
    // Type in the username
    await page.type('input','s3sink@bigendiandata.com')
    // Type in the password
    await page.type('#app > div > div > div > div.Section__sectionBody___3DCrX > div:nth-child(2) > input', temp_password)
    console.log("validating auth form: "+await test_screenshot(page, 'screenshot00_authentication', {
        fullPage: true,
    }))

    // await page.screenshot({path: 'screenshot00_authentication.png'})

    console.log("Page title: " + await page.title())
    console.log("authenticating...")
    // click Login button
    await Promise.all([
      page.click("button"),
      page.waitForTimeout(2000)
      // page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    // wait for password reset form
    try {
      // Wait up to 3 seconds for the password reset form to load
      passwordResetSelector = '#app > div > div > div > div.Section__sectionBody___3DCrX > div > input'
      await page.waitForFunction(selector => !!document.querySelector(selector), {polling:1000, timeout: 3000}, passwordResetSelector);
    } catch (e) {
      console.log('password reset form did not render')
      await browser.close();
      console.log("Done")
    }
    await page.waitForTimeout(1000)

    // enter new password
    console.log("validating password reset form: " + await test_screenshot(page, 'screenshot00_password_reset', {
        fullPage: true,
    }))
    await page.type('#app > div > div > div > div.Section__sectionBody___3DCrX > div > input', temp_password)

    console.log("Page title: " + await page.title())
    console.log("submitting new password...")
    // click Submit
    await Promise.all([
      page.click("button"),
      page.waitForTimeout(2000)
    ]);

    // wait for empty catalog view to load
    try {
        await page.waitForSelector('tbody > tr:nth-child(1) > td:nth-child(3) > a')
        await page.waitForSelector('tbody > tr > td > div > div')
    } catch (e) {
        console.log('collection view did not load')
    }
    await page.waitForTimeout(1000)
    const text = await page.$eval("tbody > tr > td > div > div", el => el.textContent);
    console.log("Table contents: '" + text + "'")

    await browser.close();
    console.log("Done")

    //////////////////////////////////////////////////////
    // Stopping here for now....
    //
    // submit a job so we have an asset to analyze
    //
    //////////////////////////////////////////////////////

    // wait for catalog view to load
    try {
        await page.waitForSelector('tbody > tr:nth-child(1) > td:nth-child(3) > a')
    } catch (e) {
        console.log('workflow status does not exist')
    }
    await page.waitForTimeout(1000)
    // await page.screenshot({path: 'screenshot01_collection_view.png'})
    console.log("validating collection view: "+await test_collection_screenshot(page, 'screenshot01_collection_view', {
        fullPage: true,
    }))


    // get workflow status and wait if its not complete
    const workflowStatusSelector = 'tbody > tr:nth-child(1) > td:nth-child(3) > a'
    await page.waitForSelector(workflowStatusSelector,  {polling:1000, timeout: 3000})
    try {
        // Wait up to 5 seconds for the asset list to load
        await page.waitForFunction(selector => !!document.querySelector(selector), {polling:1000, timeout: 3000}, workflowStatusSelector);
        let workflowStatus = await page.evaluate(selector => document.querySelector(selector).innerText, workflowStatusSelector);
        // wait up to 45 minutes for workflow to complete
        let i = 45
        console.log("Waiting for workflow to complete...")
        while (workflowStatus != "Complete" && i > 0) {
            // print the workflow status
            workflowStatus = await page.evaluate(selector => document.querySelector(selector).innerText, workflowStatusSelector);
            i = i - 1
            await sleep(60000);
            await page.goto(url,  {waitUntil: 'networkidle0'});
            console.log(i + " minutes remaining")
        }
        console.log("workflowStatus: " + workflowStatus)
    } catch (e) {
        console.log('Workflow status does not exist. Did you start a workflow?' + e)
    }

    // VALIDATE OBJECTS TAB
    await page.click('tbody > tr:nth-child(1) > td:nth-child(6) > a');
    // wait until video loads
    const video_selector='#videoPlayer > div.vjs-control-bar > div.vjs-remaining-time.vjs-time-control.vjs-control > span.vjs-remaining-time-display'
    await page.waitForSelector(video_selector,  {polling:1000, timeout: 5000})
    const rounded_button_selector = '#app > div > div.container-fluid > div > div:nth-child(1) > div:nth-child(2) > div > div > div:nth-child(2) > div > button:nth-child(2)'
    try {
        await page.waitForSelector(rounded_button_selector, {timeout: 5000})
    } catch(e) {
        // no data in this tab
    // }    await page.screenshot({path: 'screenshot02_tab_objects.png'})
        console.log("validating objects: "+await test_screenshot_containing_video(page, 'screenshot02_tab_objects', {
            fullPage: true,
        }))
    }

    // VALIDATE CELEBRITY TAB
    let tab_selector='#__BVID__28___BV_tab_button__'
    await page.click(tab_selector)
    try {
        await page.waitForSelector(rounded_button_selector, {timeout: 5000})
    } catch(e) {
        // no data in this tab
    }
    // await page.screenshot({path: 'screenshot03_tab_celebrities.png'})
    console.log("validating celebrities: "+await test_screenshot_containing_video(page, 'screenshot03_tab_celebrities', {
        fullPage: true,
    }))

    // VALIDATE MODERATION TAB
    tab_selector='#__BVID__30___BV_tab_button__'
    await page.click(tab_selector)
    try {
        await page.waitForSelector(rounded_button_selector, {timeout: 5000})
    } catch(e) {
        // no data in this tab
    }
    // await page.screenshot({path: 'screenshot04_tab_moderation.png'})
    console.log("validating moderation: "+await test_screenshot_containing_video(page, 'screenshot04_tab_moderation', {
        fullPage: true,
    }))

    // VALIDATE FACES TAB
    tab_selector='#__BVID__32___BV_tab_button__'
    await page.click(tab_selector)
    try {
        await page.waitForSelector(rounded_button_selector, {timeout: 5000})
    } catch(e) {
        // no data in this tab
    }
    // await page.screenshot({path: 'screenshot05_tab_faces.png'})
    console.log("validating faces: "+await test_screenshot_containing_video(page, 'screenshot05_tab_faces', {
        fullPage: true,
    }))

    // VALIDATE WORDS TAB
    tab_selector='#__BVID__34___BV_tab_button__'
    await page.click(tab_selector)
    try {
        await page.waitForSelector(rounded_button_selector, {timeout: 3000})
    } catch(e) {
        // no data in this tab
    }
    // await page.screenshot({path: 'screenshot06_tab_words.png'})
    console.log("validating words: "+await test_words_screenshot(page, 'screenshot06_tab_words', {
        fullPage: true,
    }))

    // VALIDATE CUES TAB
    tab_selector='#__BVID__36___BV_tab_button__'
    await page.click(tab_selector)
    await page.waitForTimeout(3000)
    // await page.screenshot({path: 'screenshot07_tab_cues.png'})
    console.log("validating cues: "+await test_screenshot_containing_video(page, 'screenshot07_tab_cues', {
        fullPage: true,
    }))

    // VALIDATE SHOTS TAB
    tab_selector='#__BVID__38___BV_tab_button__'
    await page.click(tab_selector)
    await page.waitForTimeout(3000)
    // await page.screenshot({path: 'screenshot08_tab_shots.png'})
    console.log("validating shots: "+await test_screenshot_containing_video(page, 'screenshot08_tab_shots', {
        fullPage: true,
    }))

    // VALIDATE UPLOAD PAGE
    await page.goto(url + "/upload", {waitUntil: 'load'});
    await page.waitForSelector('#app > div > div.container > div.container > div > div > button.btn.m-1.btn-secondary.collapsed', {
        visible: true,
    });
    page.once('load', () => console.log('Upload page loaded'));

    // Does the configure workflow form look right?
    await page.click('#app > div > div.container > div.container > div > div > button.btn.m-1.btn-secondary.collapsed');
    await page.waitForTimeout(500)
    // await page.screenshot({path: 'screenshot09_configure_workflow_form_default.png'})
    console.log("validating upload page: "+await test_screenshot_containing_video(page, 'screenshot09_configure_workflow_form_default', {
        fullPage: true,
    }))

    await page.click('#collapse-2 > div > div:nth-child(2) > button:nth-child(2)');
    await page.waitForTimeout(500)
    // await page.screenshot({path: 'screenshot10_configure_workflow_form_clear_all.png'})
    console.log("validating workflow config form: "+await test_screenshot_containing_video(page, 'screenshot10_configure_workflow_form_clear_all', {
        fullPage: true,
    }))

    await page.click('#collapse-2 > div > div:nth-child(2) > button:nth-child(1)');
    await page.waitForTimeout(500)
    // await page.screenshot({path: 'screenshot11_configure_workflow_form_select_all.png'})
    console.log("validating clear all: "+await test_screenshot(page, 'screenshot11_configure_workflow_form_select_all', {
        fullPage: true,
    }))

    await browser.close();
    console.log("Done")
})();

