import puppeteer from 'puppeteer';
(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    // 1. Open app logged out
    await page.goto('http://localhost:3000');
    await page.waitForSelector('form'); // Wait for login form
    
    // 3. Login with existing Admin
    await page.type('input[type="text"]', 'admin');
    await page.type('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    
    // 4. Confirm Admin Dashboard opens
    await new Promise(r => setTimeout(r, 2000));
    const content = await page.content();
    if (content.includes('Dashboard') || content.includes('ড্যাশবোর্ড')) {
      console.log('SMOKE_TEST: ADMIN_DASHBOARD_LOADED');
    } else {
      console.log('SMOKE_TEST: DASHBOARD_FAILED');
      return;
    }
    
    // 5. Refresh browser
    await page.reload();
    await new Promise(r => setTimeout(r, 2000));
    
    // 6. Confirm session remains valid
    const content2 = await page.content();
    if (content2.includes('Dashboard') || content2.includes('ড্যাশবোর্ড')) {
      console.log('SMOKE_TEST: SESSION_VALID_AFTER_REFRESH');
    } else {
      console.log('SMOKE_TEST: SESSION_LOST_AFTER_REFRESH');
    }
    
    await browser.close();
  } catch (err) {
    console.error('SMOKE TEST ERROR:', err);
  }
})();
