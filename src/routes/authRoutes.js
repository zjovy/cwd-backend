import express from 'express';

import authController from '../controllers/authController.js';
import adminMiddleware from '../middleware/adminMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireApprovalMiddleware from '../middleware/requireApprovalMiddleware.js';

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, requireApprovalMiddleware, authController.getMe);
router.post('/token', authController.handleToken);

router.get('/users', authMiddleware, adminMiddleware, authController.getAllUsers);
router.patch('/users/:uid/approve', authMiddleware, adminMiddleware, authController.approveUser);
router.patch('/users/:uid/admin', authMiddleware, adminMiddleware, authController.setAdmin);

export default router;
