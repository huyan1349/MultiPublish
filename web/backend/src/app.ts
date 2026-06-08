import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { contentRouter } from './routes/content.js';
import { adaptRouter } from './routes/adapt.js';
import { publishRouter } from './routes/publish.js';
import { aiRouter } from './routes/ai.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      // 后端需要向上游 AI 供应商发起请求；这里白名单限定域名
      connectSrc: [
        "'self'",
        'https://api.deepseek.com',
        'https://api.openai.com',
        'https://api.anthropic.com',
        'https://api.moonshot.cn',
        'https://api.minimax.io',
      ],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
// body 限制提高到 2mb 以容纳长 prompt + embedded apiKey
app.use(express.json({ limit: '2mb' }));

app.use('/health', healthRouter);
app.use('/api/contents', contentRouter);
app.use('/api', adaptRouter);
app.use('/api', publishRouter);
app.use('/api/ai', aiRouter);

app.use(errorHandler);

export { app };
