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
  
  // Login
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  
  const menuItems = [
    'ড্যাশবোর্ড',
    'সদস্য তালিকা',
    'মাসিক কালেকশন',
    'ঋণ ব্যবস্থাপনা',
    'বিনিয়োগ (FDR)',
    'ক্যাশ বুক',
    'ব্যাংক বুক',
    'আয়-ব্যয় হিসাব',
    'চার্ট অব একাউন্টস',
    'কল্যাণ তহবিল',
    'লভ্যাংশ বন্টন',
    'রিপোর্টস',
    'সেটিংস'
  ];
  
  for (const item of menuItems) {
    try {
      await page.evaluate((text) => {
        const links = Array.from(document.querySelectorAll('button, div, span, a'));
        const link = links.find(l => l.textContent && l.textContent.includes(text) && l.getBoundingClientRect().height > 0);
        if (link) link.click();
      }, item);
      await page.waitForTimeout(500);
    } catch(e) {
      console.log('Failed to click ' + item);
    }
  }
  
  fs.writeFileSync('all_errors.txt', errors.join('\n'));
  await browser.close();
})();
