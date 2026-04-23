import admin from '../config/firebase.js';
import userRepository from '../repositories/userRepository.js';

const authController = {
  async signup(req, res) {
    try {
      const { email, password, firstname, lastname } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
        });
      }

      const userRecord = await admin.auth().createUser({ email, password });

      const user = await userRepository.createUser({
        uid: userRecord.uid,
        email,
        firstname,
        lastname,
      })

      res.status(201).json({
        message: 'User created successfully',
        user
      });
    } catch (error) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-exists') {
        return res.status(400).json({ error: 'Email already in use' });
      }
      if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Username already exists' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async login(req, res) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({
          error: 'Firebase ID token is required',
        });
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);

      res.cookie('session', idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600 * 1000,
        path: '/',
      });

      res.status(200).json({
        message: 'Login successful',
        uid: decodedToken.uid,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ error: 'Authentication failed' });
    }
  },

  async getMe(req, res) {
    res.json(req.user);
  },

  async logout(_req, res) {
    try {
      res.clearCookie('session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  },

  async getAllUsers(_req, res) {
    try {
      const users = await userRepository.getAll();

      res.status(200).json(users);
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Called after Google OAuth (popup or redirect) to sync the Firebase user into the database.
  async handleToken(req, res) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ error: 'No ID token provided' });
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const user = await userRepository.findOrCreate({
        uid: decodedToken.uid,
        email: decodedToken.email,
        firstname: decodedToken.name?.split(' ')[0] || null,
        lastname: decodedToken.name?.split(' ').slice(1).join(' ') || null,
      })

      res.cookie('session', idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600 * 1000,
        path: '/',
      });

      res.json({ success: true, user });
    } catch (error) {
      console.error('Token handling error:', error);
      if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
        return res
          .status(400)
          .json({ error: 'Username already exists, please choose another' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async approveUser(req, res) {
    try {
      const { uid } = req.params;
      const { isApproved } = req.body;

      if (typeof isApproved !== 'boolean') {
        return res.status(400).json({ error: 'isApproved must be a boolean' });
      }

      if (!isApproved && uid === req.user.firebaseUid) {
        return res.status(400).json({ error: 'Cannot revoke your own access' });
      }

      const updatedUser = await userRepository.updateUser(uid, { isApproved });

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ message: 'User access updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Approve user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async setAdmin(req, res) {
    try {
      const { uid } = req.params;
      const { isAdmin } = req.body;

      if (typeof isAdmin !== 'boolean') {
        return res.status(400).json({ error: 'isAdmin must be a boolean' });
      }

      if (!isAdmin && uid === req.user.firebaseUid) {
        return res.status(400).json({ error: 'Cannot remove your own admin access' });
      }

      const updatedUser = await userRepository.updateUser(uid, { isAdmin });

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ message: 'User admin status updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Set admin error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

export default authController;
