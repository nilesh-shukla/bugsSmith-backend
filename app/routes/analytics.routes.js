import express from 'express';
import { getScanCounts } from '../controllers/analytics.controller.js';
import { isAuthenticated } from '../middleware/isAuthenticated.js';

const router = express.Router();

router.get('/scan-count', isAuthenticated, getScanCounts);

export default router;
