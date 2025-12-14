import express from 'express';
import { createFullScan, getScanProgress } from '../controllers/batch.controller';

const router = express.Router();

// POST /batch/full-scan
router.post('/full-scan', createFullScan);

// GET /batch/progress/:id
router.get('/progress/:id', getScanProgress);

export default router;

