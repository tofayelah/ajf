const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  const accounts = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const request = indexedDB.open('localforage');
      request.onsuccess = (event) => {
        const db = event.target.result;
        try {
          const transaction = db.transaction(['keyvaluepairs'], 'readonly');
          const objectStore = transaction.objectStore('keyvaluepairs');
          const getRequest = objectStore.get('AJ_WELFARE_SOCIETY_DB_V1');
          getRequest.onsuccess = () => resolve(getRequest.result ? JSON.parse(getRequest.result).accounts : []);
        } catch(e) { resolve([]); }
      };
    });
  });
  
  const acc1000 = accounts.find(a => String(a.accountCode || a.code) === '1000');
  const acc1010 = accounts.find(a => String(a.accountCode || a.code) === '1010');
  
  console.log("ACC 1000:", JSON.stringify(acc1000, null, 2));
  console.log("ACC 1010:", JSON.stringify(acc1010, null, 2));
  
  await browser.close();
})();
