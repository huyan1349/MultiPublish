import { Router } from 'express';
import type { PlatformType } from '../adapters/PlatformAdapter.js';
import * as adapterService from '../services/adapterService.js';

export const adaptRouter = Router();

// POST /api/contents/:id/adapt — generate platform outputs
adaptRouter.post('/contents/:id/adapt', async (req, res) => {
  try {
    const { platforms } = req.body as { platforms?: PlatformType[] };
    if (!platforms || platforms.length === 0) {
      res.status(400).json({ error: 'platforms is required' });
      return;
    }
    const results = await adapterService.adaptContent(req.params.id as string, platforms);
    res.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /api/contents/:id/outputs — get saved platform outputs
adaptRouter.get('/contents/:id/outputs', async (req, res) => {
  try {
    const outputs = await adapterService.getPlatformOutputs(req.params.id as string);
    res.json(outputs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get outputs' });
  }
});

// PUT /api/platform-outputs/:id — update a platform output
adaptRouter.put('/platform-outputs/:id', async (req, res) => {
  try {
    const { title, body, tags, summary } = req.body;
    const output = await adapterService.updatePlatformOutput(
      req.params.id as string,
      { title, body, tags, summary },
    );
    res.json({ ...output, tags: JSON.parse(output.tags) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update output' });
  }
});

// GET /api/platforms — list available platforms
adaptRouter.get('/platforms', (_req, res) => {
  res.json([
    { id: 'wechat', name: '微信公众号', color: 'wechat' },
    { id: 'zhihu', name: '知乎', color: 'zhihu' },
    { id: 'bilibili', name: 'B站', color: 'bilibili' },
    { id: 'xiaohongshu', name: '小红书', color: 'xiaohongshu' },
  ]);
});
