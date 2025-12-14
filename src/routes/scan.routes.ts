import express from 'express';
import { createScan, getScanById, downloadPDF } from '../controllers/scan.controller';

const router = express.Router();

// POST /scan/create
router.post('/create', createScan);

// GET /scan/:id/pdf - Download PDF report
router.get('/:id/pdf', downloadPDF);

// GET /scan/:id
router.get('/:id', getScanById);

export default router;

