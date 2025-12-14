import express from 'express';
import { createWebsite, getAllWebsites } from '../controllers/website.controller';

const router = express.Router();

// POST /website/create
router.post('/create', createWebsite);

// GET /website/all
router.get('/all', getAllWebsites);

export default router;

