const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Set localStorage to simulate logged in
  await page.evaluate(() => {
    const db = localStorage.getItem('AJ_WELFARE_SOCIETY_DB_V1') ? JSON.parse(localStorage.getItem('AJ_WELFARE_SOCIETY_DB_V1')) : {};
    db.activeUserId = 'U-001';
    db.activeScreen = 'ACCOUNTS'; // If it uses localStorage for screen
    localStorage.setItem('AJ_WELFARE_SOCIETY_DB_V1', JSON.stringify(db));
    
    // Some apps use auth context state, let's also try to click login
  });
  
  await page.reload({ waitUntil: 'networkidle' });
  
  await page.waitForTimeout(2000);
  
  // Try logging in via UI if it's still on login page
  if (await page.$('text=Log In') || await page.$('text=Sign In') || await page.$('text=Login')) {
     const button = await page.$('button[type="submit"]');
     if(button) {
       await button.click();
       await page.waitForTimeout(2000);
     }
  }

  // If there's a specific route or hash
  // await page.goto('http://localhost:3000/#accounts')

  await browser.close();
})();
