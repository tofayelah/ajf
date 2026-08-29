const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if(msg.type() === 'error') console.log('BROWSER_ERROR:', msg.text());
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message, err.stack));
  
  await page.goto('http://localhost:3000');
  
  await page.waitForSelector('input[placeholder*="ID"]');
  await page.fill('input[placeholder*="ID"]', 'admin');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(3000);
  
  // click members
  await page.click('text="সদস্য তালিকা"'); // wait wait, is it in bangla? Or English?
  
  await page.waitForTimeout(3000);
  
  await browser.close();
})();
