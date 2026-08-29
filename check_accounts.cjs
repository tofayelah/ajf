const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push(`${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}\n${error.stack}`);
  });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  
  // click Chart of Accounts
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('button, div, span, a'));
    const link = links.find(l => l.textContent && l.textContent.includes('চার্ট অব একাউন্টস') && l.getBoundingClientRect().height > 0);
    if (link) link.click();
  });
  
  await page.waitForTimeout(2000);
  
  fs.writeFileSync('accounts_runtime_errors.txt', errors.join('\n\n'));
  
  let html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('accounts_body.txt', html);
  
  await browser.close();
})();
