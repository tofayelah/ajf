import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`BROWSER ${msg.type().toUpperCase()}:`, msg.text());
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log('BROWSER EXCEPTION:', err.message);
    errors.push(err.message);
  });
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Give it a bit more time to render
  } catch(e) {
    console.log("Playwright goto failed:", e);
  }
  await browser.close();
  
  if (errors.length > 0) {
    console.log("ERRORS FOUND");
  } else {
    console.log("ALL CLEAN");
  }
})();
