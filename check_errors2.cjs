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
  
  // Try to click login
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    if (inputs.length >= 2) {
        inputs[0].value = 'admin';
        inputs[1].value = '123456';
        
        // Dispatch input events
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    const btns = Array.from(document.querySelectorAll('button'));
    const loginBtn = btns.find(b => b.textContent.includes('Login') || b.textContent.includes('লগইন করুন') || b.textContent.includes('Sign In'));
    if(loginBtn) loginBtn.click();
  });
  
  await page.waitForTimeout(2000);
  
  // Try to click Accounts in the sidebar
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a, button, div, span'));
    const accLink = links.find(l => l.textContent.includes('চার্ট অব একাউন্টস') || l.textContent.includes('Chart of Accounts'));
    if(accLink) accLink.click();
  });
  
  await page.waitForTimeout(2000);
  
  fs.writeFileSync('runtime_errors2.txt', errors.join('\n\n'));
  
  // also grab the HTML body to see if it's literally empty
  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('body_html2.txt', html);
  
  await browser.close();
})();
