const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set local storage for active user
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.setItem('activeUser', JSON.stringify({
      id: 'usr-1',
      username: 'test',
      role: 'MEMBER',
      linkedMemberId: 'AJM-000001'
    }));
  });
  
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message, err.stack));
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
