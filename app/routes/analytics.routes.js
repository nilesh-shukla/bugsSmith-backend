import express from 'express';
import { getScanCounts } from '../controllers/analytics.controller.js';
import analysisController from '../controllers/analysis.controller.js';
import { isAuthenticated } from '../middleware/isAuthenticated.js';

const router = express.Router();

router.get('/scan-count', isAuthenticated, getScanCounts);

// GET summary for a specific analysis (file-level metrics)
router.get('/analysis/:analysisId/summary', isAuthenticated, analysisController.getAnalysisSummary);

export default router;
