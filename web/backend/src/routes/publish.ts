import { Router } from 'express';
import * as publishService from '../services/publishService.js';

export const publishRouter = Router();

// POST /api/publish — publish one output
publishRouter.post('/publish', async (req, res) => {
  try {
    const { outputId } = req.body as { outputId?: string };
    if (!outputId) {
      res.status(400).json({ error: 'outputId is required' });
      return;
    }
    const result = await publishService.publishOutput(outputId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/publish/batch — batch publish
publishRouter.post('/publish/batch', async (req, res) => {
  try {
    const { outputIds } = req.body as { outputIds?: string[] };
    if (!outputIds || outputIds.length === 0) {
      res.status(400).json({ error: 'outputIds is required' });
      return;
    }
    const results = await publishService.batchPublish(outputIds);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to batch publish' });
  }
});

// GET /api/publish-records — list publish records
publishRouter.get('/publish-records', async (req, res) => {
  try {
    const contentId = req.query.contentId as string | undefined;
    const records = await publishService.getPublishRecords(contentId);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get records' });
  }
});
