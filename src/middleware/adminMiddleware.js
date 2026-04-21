import admin from '../config/firebase.js';
import userRepository from '../repositories/userRepository.js';

const adminMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.session || (req.headers.authorization?.split(' ')[1]);

    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = await userRepository.findByUid(decodedToken.uid);

    if (!user || !user.isAdmin !== true) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export default adminMiddleware;