import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

let commitSha = 'unknown';
let branch = 'main';

try {
  commitSha = execSync('git rev-parse HEAD', { stdio: 'pipe' }).toString().trim();
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim();
  } catch(e) {}
} catch (e) {
  console.log('Git not available or not a git repository.');
}

const buildInfo = {
  commitSha,
  branch,
  buildTime: new Date().toISOString(),
  environment: 'production'
};

const distPath = path.join(process.cwd(), 'dist');
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

fs.writeFileSync(path.join(distPath, 'build-info.json'), JSON.stringify(buildInfo, null, 2));
console.log('Build info generated.');
