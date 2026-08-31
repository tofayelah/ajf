const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:3000');
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Current URL:", page.url());
  
  // check if there is an error boundary message
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (bodyText.includes('Cannot read properties of undefined')) {
    console.log("Found error message on screen!");
  } else {
    console.log("No error message on screen.");
  }
  
  await browser.close();
})();
