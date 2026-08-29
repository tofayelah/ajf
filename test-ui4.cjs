const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if(msg.type() === 'error') console.log('BROWSER_ERROR:', msg.text());
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message, err.stack));
  
  await page.goto('http://localhost:3000');
  
  await page.waitForTimeout(2000);
  
  const content = await page.content();
  console.log("HTML:", content.substring(0, 1000));
  
  await browser.close();
})();
