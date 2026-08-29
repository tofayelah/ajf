const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let errors = [];
  page.on('console', msg => { if(msg.type() === 'error') errors.push(msg.text()); });
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);
  
  // Login
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  
  console.log("ERRORS:", errors);
  await browser.close();
})();
