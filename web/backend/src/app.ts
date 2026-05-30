import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { contentRouter } from './routes/content.js';
import { adaptRouter } from './routes/adapt.js';
import { publishRouter } from './routes/publish.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.deepseek.com"],
    },
  },
}));
app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/contents', contentRouter);
app.use('/api', adaptRouter);
app.use('/api', publishRouter);

app.use(errorHandler);

export { app };
