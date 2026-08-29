const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

async function run() {
  const server = spawn('npm', ['run', 'dev'], { detached: true });
  await new Promise(resolve => setTimeout(resolve, 8000));

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('--- PAGE ERROR ---');
    console.log(err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('--- CONSOLE ERROR ---');
      console.log(msg.text());
    }
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });
  } catch (e) {
    console.log('Goto Error:', e.message);
  }

  await browser.close();
  process.kill(-server.pid);
  process.exit(0);
}
run();
