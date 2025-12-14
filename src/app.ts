import express, { Request, Response } from 'express';
import cors from 'cors';
import websiteRoutes from './routes/website.routes';
import scanRoutes from './routes/scan.routes';
import batchRoutes from './routes/batch.routes';

const app = express();

// CORS
app.use(cors());

// JSON parser
app.use(express.json());

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

// API routes
app.use('/api/v1/website', websiteRoutes);
app.use('/api/v1/scan', scanRoutes);
app.use('/api/v1/batch', batchRoutes);

export default app;

