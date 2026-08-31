import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (!response.ok()) {
      console.log('FAILED URL:', response.url(), response.status());
    }
  });
  
  await page.goto('http://localhost:3000');
  await new Promise(resolve => setTimeout(resolve, 3000));
  await browser.close();
})();
