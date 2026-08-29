const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  // Create mock old db state with old account format
  const mockOldDb = {
    settings: { currentFinancialYear: "FY2024" },
    users: [{ userId: "U-001", role: "ADMIN", fullName: "Test Admin" }],
    accounts: [
      {
        accountCode: "1000",
        accountName: "Cash",
        accountNameBn: "নগদ",
        accountGroup: "Asset",
        accountType: "Asset"
      } // OLD SCHEMA!
    ],
    members: [],
    activeUserId: "U-001",
    activeScreen: "ACCOUNTS"
  };

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.evaluate((dbStr) => {
    localStorage.setItem('AJ_WELFARE_SOCIETY_DB_V1', dbStr);
  }, JSON.stringify(mockOldDb));
  
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await browser.close();
})();
