import admin from '../config/firebase.js';
import userRepository from '../repositories/userRepository.js';

const requireApprovalMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.session || (req.headers.authorization?.split(' ')[1]);

    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = await userRepository.findByUid(decodedToken.uid);

    if (!user || !user.isApproved) {
        return res.status(403).json({ error: 'User not approved yet' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Require approval middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export default requireApprovalMiddleware;