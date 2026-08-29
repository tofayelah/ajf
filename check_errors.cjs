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
  
  await page.waitForTimeout(3000);
  
  fs.writeFileSync('runtime_errors.txt', errors.join('\n\n'));
  
  // also grab the HTML body to see if it's literally empty
  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('body_html.txt', html);
  
  await browser.close();
})();
