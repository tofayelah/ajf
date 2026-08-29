const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000');
  
  await page.evaluate(async () => {
    localStorage.clear();
    return new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('localforage');
      req.onsuccess = resolve;
      req.onerror = resolve;
    });
  });
  
  console.log("DB CLEARED");
  await browser.close();
})();
