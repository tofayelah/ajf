const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  
  // Click on member "Tofayel Ahmed Bhuya"
  // Let's just log the full text content to see if we can find it
  const html = await page.content();
  console.log("Found Admission Fee in HTML?", html.includes('Admission Fee'));
  await browser.close();
})();
