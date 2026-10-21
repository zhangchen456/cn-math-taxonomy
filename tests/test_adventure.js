/* Desktop interaction smoke test. Run with NODE_PATH pointing to Playwright. */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const questions = require('../data/questions.json');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page = await browser.newPage({viewport:{width:1440,height:1100}});
 page.setDefaultTimeout(10000);
 const errors=[]; page.on('pageerror', e=>errors.push(e.message));
 const base=process.env.BASE_URL || 'http://localhost:8766';
 console.log('Opening dashboard'); await page.goto(base); await page.waitForSelector('.topic-card');
 assert.equal(await page.locator('.topic-card').count(),8);
 await page.locator('.theme-trigger').click();
 await page.locator('#theme-dialog [data-theme-choice="snow"]').click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'snow');
 await page.locator('#theme-dialog .dialog-close').click();
 await page.reload(); await page.waitForSelector('.topic-card');
 assert.equal(await page.locator('html').getAttribute('data-theme'),'snow');
 console.log('Starting practice'); await page.locator('[data-topic="cnm_p001"]').click();
 await page.locator('#practice-form button[type=submit]').click();
 assert.match(await page.locator('#answer-notice').innerText(),/先选/);
 await page.locator('#practice-answer').fill('４');
 await page.locator('#practice-form button[type=submit]').click();
 assert.match(await page.locator('#question-feedback').innerText(),/答对啦/);
 await page.locator('#next-question').click();
 await page.locator('#practice-dialog .dialog-close').click();
 await page.reload(); await page.waitForSelector('.topic-card');
 await page.locator('#continue-button').click();
 assert.match(await page.locator('.practice-meta').innerText(),/第 2/);
 for(let i=1;i<4;i++){
   const q=questions.filter(q=>q.topicId==='cnm_p001')[i];
   if(q.type==='choice') await page.locator('input[value="'+q.answer+'"]').check();
   else await page.locator('#practice-answer').fill(q.answer);
   await page.locator('#practice-form button[type=submit]').click();
   await page.locator('#next-question').click();
 }
 assert.match(await page.locator('#practice-title').innerText(),/又探索/);
 await page.locator('#back-island').click();
 assert.equal(await page.locator('#completed-count').innerText(),'1');
 assert.equal(await page.locator('#attempt-count').innerText(),'4');
 await page.locator('[data-subject="english"]').click();
 assert.equal(await page.locator('#grade').inputValue(),'3');
 await page.locator('.topic-card').first().click();
 assert.ok((await page.locator('#practice-title').innerText()).length>0);
 await page.locator('#practice-dialog .dialog-close').click();
 await page.locator('#topic-search').fill('does-not-exist');
 assert.match(await page.locator('.topic-empty').innerText(),/没有找到/);
 await page.locator('#topic-search').fill('');
 console.log('Checking graph'); await page.locator('#map-link').click();
 await page.waitForSelector('#list .vol');
 assert.equal(await page.locator('html').getAttribute('data-theme'),'snow');
 await page.goto(base+'/diagnose/?target=cnm_p001');
 await page.waitForSelector('#root button');
 assert.equal(await page.locator('html').getAttribute('data-theme'),'snow');
 await page.goto(base); await page.waitForSelector('.topic-card');
 for(const theme of ['blocks','hero','snow']){
   await page.locator('.world-cards [data-theme-choice="'+theme+'"]').click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
   fs.mkdirSync('screenshots/adventure',{recursive:true});
   await page.screenshot({path:'screenshots/adventure/'+theme+'-desktop.png',fullPage:true});
 }
 assert.deepEqual(errors,[]);
 console.log('Desktop smoke passed: themes, persisted theme, cross-page theme, empty answer, full-width numeric answer, resumed round, choices, completion stats, English, search, no overflow or browser errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
