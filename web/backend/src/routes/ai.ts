import { Router, Request, Response } from 'express';
import { Readable } from 'node:stream';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

export const aiRouter = Router();

aiRouter.post('/chat', async (req: Request, res: Response) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured on server' });
    return;
  }

  const { stream, ...body } = req.body;

  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ...body, stream: !!stream }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      res.status(response.status).json(err);
      return;
    }

    if (stream && response.body) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const nodeStream = Readable.fromWeb(response.body as any);
      nodeStream.pipe(res);
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (err) {
    res.status(500).json({ error: 'AI proxy request failed' });
  }
});
