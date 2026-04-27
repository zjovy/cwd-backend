import express from 'express';

import authController from '../controllers/authController.js';
import adminMiddleware from '../middleware/adminMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.get('/profile', authMiddleware, authController.getMe);
router.post('/token', authController.handleToken);

router.get('/users', authMiddleware, adminMiddleware, authController.getAllUsers);
router.patch('/users/:uid/role', authMiddleware, adminMiddleware, authController.setRole);

export default router;
