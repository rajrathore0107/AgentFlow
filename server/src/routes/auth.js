import { Router } from 'express';
import User from '../models/User.js';
import { generateToken, authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const user = await User.create({ email, username, password });
    const token = generateToken(user);

    res.status(201).json({
      message: 'Account created successfully',
      user: { id: user.id, email: user.email, username: user.username },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = User.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, username: user.username },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
