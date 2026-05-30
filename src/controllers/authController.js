import admin from '../config/firebase.js';
import userRepository from '../repositories/userRepository.js';

const authController = {
  async signup(req, res) {
    let userRecord;
    let dbUserCreated = false;
    try {
      const { email, password, firstname, lastname } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
        });
      }

      userRecord = await admin.auth().createUser({ email, password });

      const user = await userRepository.createUser({
        uid: userRecord.uid,
        email,
        firstname,
        lastname,
      });
      dbUserCreated = true;

      const customToken = await admin.auth().createCustomToken(userRecord.uid);

      res.status(201).json({
        message: 'User created successfully',
        user,
        customToken,
      });
    } catch (error) {
      if (userRecord) {
        await admin.auth().deleteUser(userRecord.uid).catch(() => {});
        if (dbUserCreated) {
          await userRepository.deleteByUid(userRecord.uid).catch(() => {});
        }
      }
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-exists') {
        return res.status(400).json({ error: 'Email already in use' });
      }
      if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Email already in use' });
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
        return res.status(400).json({ error: 'Email already in use' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async setRole(req, res) {
    try {
      const { uid } = req.params;
      const { role } = req.body;

      if (!['pending', 'member', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'role must be pending, member, or admin' });
      }

      if (uid === req.user.firebaseUid) {
        return res.status(400).json({ error: 'Cannot change your own role' });
      }

      const updatedUser = await userRepository.setRole(uid, role);

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ message: 'User role updated', user: updatedUser });
    } catch (error) {
      console.error('Set role error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

export default authController;
