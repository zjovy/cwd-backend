import express from 'express';

import authController from '../controllers/authController.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);
router.get('/profile', authController.getMe);
router.get('/users', adminMiddleware, authController.getAllUsers);
router.post('/token', authController.handleToken);

router.patch('/users/:uid/approve', adminMiddleware, authController.approveUser);

export default router;
