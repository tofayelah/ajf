const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`CONSOLE ERROR: ${msg.text()}`);
    }
  });
  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}\n${error.stack}`);
  });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Fill in the form properly
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', '123456');
  
  // click login
  const loginBtn = await page.$('button[type="submit"]');
  if (loginBtn) {
    await loginBtn.click();
  }
  
  await page.waitForTimeout(2000);
  
  // take a look at the HTML body now
  let html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('body_dashboard.txt', html);
  
  // Try to click Accounts in the sidebar (it might be hidden under a menu, or on the dashboard)
  // Let's just evaluate and click anything that says "Chart of Accounts" or "চার্ট অব একাউন্টস"
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a, button, div, span'));
    const accLink = links.find(l => l.textContent.includes('চার্ট অব একাউন্টস') || l.textContent.includes('Chart of Accounts'));
    if(accLink) accLink.click();
  });
  
  await page.waitForTimeout(2000);
  
  fs.writeFileSync('runtime_errors3.txt', errors.join('\n\n'));
  
  html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('body_accounts.txt', html);
  
  await browser.close();
})();
