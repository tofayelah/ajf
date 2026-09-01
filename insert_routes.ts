import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const target = `app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    runtime: 'AJF Welfare ERP Runtime OK',
    timestamp: new Date().toISOString()
  });
});`;

const replacement = target + `

// --- System Status Routes ---
app.get('/api/system/health', async (req: Request, res: Response) => {
  try {
    const stats = await fs.promises.stat(DB_FILE);
    res.json({
      runtime: 'OK',
      database: 'OK',
      lastModified: stats.mtime.toISOString(),
      databaseVersion: '1.0'
    });
  } catch (err: any) {
    res.json({
      runtime: 'OK',
      database: 'ERROR',
      error: err.message
    });
  }
});

app.get('/api/system/github-status', async (req: Request, res: Response) => {
  try {
    let deployedCommitSha = 'unknown';
    let buildTime = 'unknown';
    let buildBranch = 'main';
    
    try {
      if (process.env.NODE_ENV !== 'production') {
        try {
          const { execSync } = require('child_process');
          deployedCommitSha = execSync('git rev-parse HEAD', { stdio: 'pipe' }).toString().trim();
          buildBranch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim();
        } catch(e) {}
      } else {
        const buildInfoPath = path.join(process.cwd(), 'dist', 'build-info.json');
        if (require('fs').existsSync(buildInfoPath)) {
          const buildInfo = JSON.parse(require('fs').readFileSync(buildInfoPath, 'utf8'));
          deployedCommitSha = buildInfo.commitSha || 'unknown';
          buildTime = buildInfo.buildTime || 'unknown';
          buildBranch = buildInfo.branch || 'main';
        }
      }
    } catch(e) {}

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || buildBranch || 'main';
    const token = process.env.GITHUB_TOKEN;

    if (!owner || !repo) {
      return res.json({
        githubReachable: false,
        githubBranch: branch,
        githubCommitSha: 'unknown',
        deployedCommitSha,
        synced: false,
        buildTime,
        error: 'GitHub config missing (GITHUB_OWNER, GITHUB_REPO)'
      });
    }

    const headers: any = {
        'User-Agent': 'AJF-ERP-System',
        'Accept': 'application/vnd.github.v3+json'
    };
    if (token) {
        headers['Authorization'] = \`token \${token}\`;
    }

    const ghRes = await fetch(\`https://api.github.com/repos/\${owner}/\${repo}/commits/\${branch}\`, { headers });
    if (!ghRes.ok) {
        return res.json({
          githubReachable: false,
          githubBranch: branch,
          githubCommitSha: 'unknown',
          deployedCommitSha,
          synced: false,
          buildTime,
          error: \`GitHub API error: \${ghRes.statusText}\`
        });
    }

    const ghData = await ghRes.json();
    const githubCommitSha = ghData.sha;
    
    const synced = deployedCommitSha !== 'unknown' && githubCommitSha === deployedCommitSha;

    res.json({
      githubReachable: true,
      githubBranch: branch,
      githubCommitSha,
      deployedCommitSha,
      synced,
      buildTime
    });

  } catch (error: any) {
    res.json({
      githubReachable: false,
      githubBranch: process.env.GITHUB_BRANCH || 'main',
      githubCommitSha: 'unknown',
      deployedCommitSha: 'unknown',
      synced: false,
      buildTime: 'unknown',
      error: error.message
    });
  }
});
`;

content = content.replace(target, replacement);
fs.writeFileSync('server.ts', content);
console.log('Routes added');
