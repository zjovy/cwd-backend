import admin from '../config/firebase.js';
import userRepository from '../repositories/userRepository.js';

const authMiddleware = async (req, res, next) => {
  try {
    const token =
      req.cookies.session || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No Firebase ID token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = await userRepository.findByUid(decodedToken.uid);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Firebase Auth middleware error:', error);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Firebase ID token expired' });
    }
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid Firebase ID token' });
    }
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

export default authMiddleware;
