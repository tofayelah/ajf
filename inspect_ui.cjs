const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  const isLoginPage = await page.$('input[type="password"]');
  if (isLoginPage) {
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
  }
  
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a, button, span, div'));
    const link = links.find(l => l.textContent && l.textContent.includes('চার্ট অব একাউন্টস') && l.getBoundingClientRect().height > 0);
    if (link) link.click();
  });
  
  await page.waitForTimeout(2000);
  
  const tableData = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    return rows.map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent.trim()));
  });
  
  console.log("TABLE DATA START");
  tableData.slice(0, 5).forEach(row => console.log(row));
  
  await browser.close();
})();
