import express from 'express';
import rateLimit from 'express-rate-limit';

import authController from '../controllers/authController.js';
import adminMiddleware from '../middleware/adminMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.post('/token', authLimiter, authController.handleToken);

router.get('/users', authMiddleware, adminMiddleware, authController.getAllUsers);
router.patch('/users/:uid/role', authMiddleware, adminMiddleware, authController.setRole);

export default router;
