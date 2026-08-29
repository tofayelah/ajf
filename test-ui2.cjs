const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if(msg.type() === 'error') console.log('BROWSER_ERROR:', msg.text());
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message, err.stack));
  
  await page.goto('http://localhost:3000');
  
  // wait for the login page to load
  await page.waitForSelector('input[type="email"]');
  
  // login
  await page.fill('input[type="email"]', 'tofayelah@gmail.com');
  await page.fill('input[type="password"]', 'password'); // Assuming this is the password or it's mocked
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
