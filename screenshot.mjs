import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await new Promise(resolve => setTimeout(resolve, 3000));
  await page.screenshot({ path: 'screenshot.png' });
  
  const content = await page.content();
  if (content.includes('Login') || content.includes('লগইন')) {
     console.log('PAGE_STATUS: LOGIN_SCREEN_VISIBLE');
  } else {
     console.log('PAGE_STATUS: UNKNOWN');
     console.log(content.substring(0, 500));
  }
  
  await browser.close();
})();
