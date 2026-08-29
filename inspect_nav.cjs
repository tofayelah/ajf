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
    const links = Array.from(document.querySelectorAll('button'));
    const link = links.find(l => l.textContent && l.textContent.includes('অন্যান্য'));
    if (link) link.click();
  });
  await page.waitForTimeout(500);
  
  const content = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a')).map(el => el.textContent.trim()).filter(t => t.length > 0);
  });
  console.log("NAV AFTER 'অন্যান্য':", content);
  
  await browser.close();
})();
