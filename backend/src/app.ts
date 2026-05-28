import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { contentRouter } from './routes/content.js';
import { publishRouter } from './routes/publish.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/contents', contentRouter);
app.use('/api', publishRouter);

app.use(errorHandler);

export { app };
