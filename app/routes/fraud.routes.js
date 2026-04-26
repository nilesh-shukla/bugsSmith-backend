import express from 'express';
import { checkFakeProfile } from '../controllers/fraud.controller.js';
const router = express.Router();

router.post('/check-profile', checkFakeProfile);

export default router;