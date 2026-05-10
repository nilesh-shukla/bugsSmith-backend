import express from 'express';
import { uploadProfiles } from '../controllers/upload.controller.js';
import { uploadMiddleware } from '../middleware/multerConfig.js';
import { isAuthenticated } from '../middleware/isAuthenticated.js';

const router = express.Router();

// Accepts multipart/form-data with `file` field, or raw JSON array
router.post('/upload-profiles', isAuthenticated, uploadMiddleware.single('file'), uploadProfiles);

export default router;
