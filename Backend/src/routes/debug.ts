import { Router } from 'express';
import { classifyImportance } from '../importance';

const router = Router();

router.get('/__ping', (_req, res) => res.json({ ok: true, scope: 'debug' }));

router.post('/classify', async (req, res) => {
  try {
    const text = String(req.body?.text ?? '').trim();
    if (!text) return res.status(400).json({ error: 'text required' });
    const result = await classifyImportance(text);
    res.json({ input: text, result });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'unknown error' });
  }
});

export default router;
