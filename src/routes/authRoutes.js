import express from 'express';

import authController from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireApprovalMiddleware from '../middleware/requireApprovalMiddleware.js';
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

router.post('/invite', adminMiddleware, async (req, res) => {
  const { email } = req.body;
  await userRepository.addToAllowlist(email);
  res.json({ message: 'User invited successfully' });
});

export default router;
