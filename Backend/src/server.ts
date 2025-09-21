import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import messages from './routes/messages';
import chat from './routes/chat';

const app = express();

app.use(cors());
app.use(express.json());

// simple logger
app.use((req, _res, next) => { console.log(`${req.method} ${req.url}`); next(); });

// health
app.get('/health', (_req, res) => res.json({ ok: true }));

// mount the messages router at a base path
app.use('/api/messages', messages);
app.use('/api/chat', chat);
// helpful route inspector (debug)
app.get('/__debug/routes', (_req, res) => {
  const seen: Array<{ path: string; methods: string[] }> = [];
  function walk(stack: any[]) {
    for (const layer of stack) {
      if (layer.route?.path) {
        seen.push({ path: layer.route.path, methods: Object.keys(layer.route.methods || {}) });
      } else if (layer.name === 'router' && layer.handle?.stack) {
        walk(layer.handle.stack);
      }
    }
  }
  // @ts-ignore
  if ((app as any)._router?.stack) walk((app as any)._router.stack);
  res.json(seen);
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.originalUrl }));

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
