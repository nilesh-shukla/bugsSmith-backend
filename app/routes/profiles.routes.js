import express from 'express';
import { listProfiles, getProfileDetail } from '../controllers/profiles.controller.js';
import { isAuthenticated } from '../middleware/isAuthenticated.js';

const router = express.Router();

// List analyzed profiles (paginated + filters)
router.get('/', isAuthenticated, listProfiles);

// Profile detail (side panel)
router.get('/:id', isAuthenticated, getProfileDetail);

export default router;
