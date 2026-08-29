const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function run() {
  const server = spawn('npm', ['run', 'dev'], { detached: true });
  await new Promise(resolve => setTimeout(resolve, 3000));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', err => {
    errors.push(err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 5000 });
  } catch (e) {
    errors.push(e.message);
  }

  console.log('--- ERRORS ---');
  console.log(errors.join('\n'));
  
  await browser.close();
  process.kill(-server.pid);
  process.exit(0);
}
run();
