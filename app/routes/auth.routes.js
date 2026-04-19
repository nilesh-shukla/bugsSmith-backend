import express from 'express';
import { loginController, logoutController, registerController, refreshController } from '../controllers/auth.controllers.js';
import { isAuthenticated } from '../middleware/isAuthenticated.js';

const router = express.Router();

router.post('/login', loginController);
router.post('/register', registerController);
router.get('/logout', isAuthenticated, logoutController);
router.post('/refresh', refreshController);

export default router;