import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const target = `
// --- System Status Routes ---
app.get('/api/system/health', async (req: Request, res: Response) => {`;

const index1 = content.indexOf(target);
if (index1 !== -1) {
  const index2 = content.indexOf(target, index1 + 1);
  if (index2 !== -1) {
    const nextRoute = content.indexOf('// --- Auth Routes ---', index2);
    content = content.substring(0, index2) + content.substring(nextRoute);
    fs.writeFileSync('server.ts', content);
    console.log('Fixed duplicates');
  }
}
