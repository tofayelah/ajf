import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

dotenv.config();

const app = express();
// STRICT ENFORCEMENT: Ignore process.env.PORT in this specific environment
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DB_FILE = path.join(process.cwd(), 'database.json');

// API Routes
app.get('/api/sync', async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      res.json(null); // No data yet
    } else {
      console.error('Error fetching state:', error);
      res.status(500).json({ error: 'Failed to fetch state' });
    }
  }
});

app.post('/api/sync', async (req, res) => {
  try {
    const stateStr = JSON.stringify(req.body);
    await fs.writeFile(DB_FILE, stateStr, 'utf8');
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving state:', error);
    res.status(500).json({ error: 'Failed to save state' });
  }
});

// Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
