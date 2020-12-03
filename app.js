const puppeteer = require('puppeteer');
const ScreenshotTester = require('puppeteer-screenshot-tester')

let url = process.env.WEBAPP_URL;
(async () => {
    const tester = await ScreenshotTester(0.8, false, false, [], {
        transparency: 0.5
    })

    console.log("Loading " + url)
    // Chromium doesn't support video playback, so use Chrome instead
    // const browser = await  puppeteer.launch({executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true})
    const browser = await  puppeteer.launch({executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox']})
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 926 });
    await page.goto(url,  {waitUntil: 'networkidle0'});
    // Type in the username
    await page.type('input','ianwow@amazon.com')
    // Type in the password
    await page.type('#app > div > div > div > div.Section__sectionBody___3DCrX > div:nth-child(2) > input','Password123@')
    await page.screenshot({path: 'screenshot00_authentication.png'})
    console.log("Page title: " + await page.title())
    console.log("authenticating...")
    // click Login button
    await Promise.all([
      page.click("button"),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    console.log('validating collection view...')
    try {
        await page.waitForSelector('tbody > tr:nth-child(1) > td:nth-child(3) > a')
    } catch (e) {
        console.log('workflow status does not exist')
    }
    await page.waitForTimeout(1000)
    await page.screenshot({path: 'screenshot01_collection_view.png'})
    // get workflow status and wait if its not complete
    const workflowStatusSelector = 'tbody > tr:nth-child(1) > td:nth-child(3) > a'
    await page.waitForSelector(workflowStatusSelector,  {polling:1000, timeout: 3000})
    try {
        // Wait up to 5 seconds for the asset list to load
        await page.waitForFunction(selector => !!document.querySelector(selector), {polling:1000, timeout: 3000}, workflowStatusSelector);
        let workflowStatus = await page.evaluate(selector => document.querySelector(selector).innerText, workflowStatusSelector);
        // wait for workflow if it has not completed yet
        if (workflowStatus != "Complete") {
            console.log("Waiting for workflow to complete...")
            // Wait up to 30 minutes for the workflow to complete
            await page.waitForFunction(
              selector => document.querySelector(selector).innerText == "Complete",
              {polling:10000, timeout:30*60*1000},
              workflowStatusSelector);
            // print the workflow status
            workflowStatus = await page.evaluate(selector => document.querySelector(selector).innerText, workflowStatusSelector);
            console.log("workflowStatus: " + workflowStatus)
        }
    } catch (e) {
        console.log('Workflow status does not exist. Did you start a workflow?' + e)
    }

    // VALIDATE OBJECTS TAB
    console.log("validating objects tab...")
    await page.click('tbody > tr:nth-child(1) > td:nth-child(6) > a');
    // wait until video loads
    const video_selector='#videoPlayer > div.vjs-control-bar > div.vjs-remaining-time.vjs-time-control.vjs-control > span.vjs-remaining-time-display'
    await page.waitForSelector(video_selector,  {polling:1000, timeout: 5000})
    const rounded_button_selector = '#app > div > div.container-fluid > div > div:nth-child(1) > div:nth-child(2) > div > div > div:nth-child(2) > div > button:nth-child(2)'
    try {
        await page.waitForSelector(rounded_button_selector, {timeout: 5000})
    } catch(e) {
        // no data in this tab
    }    await page.screenshot({path: 'screenshot02_tab_objects.png'})

    // VALIDATE CELEBRITY TAB
    console.log("validating celebrities tab...")
    let tab_selector='#__BVID__28___BV_tab_button__'
    await page.click(tab_selector)
    try {
        await page.waitForSelector(rounded_button_selector, {timeout: 5000})
    } catch(e) {
        // no data in this tab
    }    await page.screenshot({path: 'screenshot03_tab_celebrities.png'})

    // VALIDATE MODERATION TAB
    console.log("validating moderation tab...")
    tab_selector='#__BVID__30___BV_tab_button__'
    await page.click(tab_selector)
    try {
        await page.waitForSelector(rounded_button_selector, {timeout: 5000})
    } catch(e) {
        // no data in this tab
    }
    await page.screenshot({path: 'screenshot04_tab_moderation.png'})

    // VALIDATE FACES TAB
    console.log("validating faces tab...")
    tab_selector='#__BVID__32___BV_tab_button__'
    await page.click(tab_selector)
    try {
        await page.waitForSelector(rounded_button_selector, {timeout: 5000})
    } catch(e) {
        // no data in this tab
    }    await page.screenshot({path: 'screenshot05_tab_faces.png'})

    // VALIDATE WORDS TAB
    console.log("validating words tab...")
    tab_selector='#__BVID__34___BV_tab_button__'
    await page.click(tab_selector)
    try {
        await page.waitForSelector(rounded_button_selector, {timeout: 3000})
    } catch(e) {
        // no data in this tab
    }    await page.screenshot({path: 'screenshot06_tab_words.png'})

    // VALIDATE CUES TAB
    console.log("validating cues tab...")
    tab_selector='#__BVID__36___BV_tab_button__'
    await page.click(tab_selector)
    await page.waitForTimeout(3000)
    await page.screenshot({path: 'screenshot07_tab_cues.png'})

    // VALIDATE SHOTS TAB
    console.log("validating shots tab...")
    tab_selector='#__BVID__38___BV_tab_button__'
    await page.click(tab_selector)
    await page.waitForTimeout(3000)
    await page.screenshot({path: 'screenshot08_tab_shots.png'})

    // VALIDATE UPLOAD PAGE
    console.log("validating upload page...")
    await page.goto(url + "/upload", {waitUntil: 'load'});
    await page.waitForSelector('#app > div > div.container > div.container > div > div > button.btn.m-1.btn-secondary.collapsed', {
        visible: true,
    });
    page.once('load', () => console.log('Upload page loaded'));

    // Does the configure workflow form look right?
    await page.click('#app > div > div.container > div.container > div > div > button.btn.m-1.btn-secondary.collapsed');
    await page.waitForTimeout(500)
    await page.screenshot({path: 'screenshot09_configure_workflow_form_default.png'})
    console.log('validating workflow config form...')

    await page.click('#collapse-2 > div > div:nth-child(2) > button:nth-child(2)');
    await page.waitForTimeout(500)
    await page.screenshot({path: 'screenshot10_configure_workflow_form_clear_all.png'})

    await page.click('#collapse-2 > div > div:nth-child(2) > button:nth-child(1)');
    await page.waitForTimeout(500)
    await page.screenshot({path: 'screenshot11_configure_workflow_form_select_all.png'})

    console.log("Screenshot validated?")
    console.log(await tester(page, 'test2', {
        fullPage: true,
    }))

    await browser.close();
    console.log("Done")
})();

