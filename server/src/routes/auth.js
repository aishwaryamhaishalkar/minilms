import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

function tokenFor(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

function profile(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, studentId: user.studentId };
}

router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, studentId } = req.body;
  if (!name?.trim() || !email?.trim() || !password || !studentId?.trim()) {
    return res.status(400).json({ success: false, message: 'Name, email, password, and student ID are required' });
  }
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
    role: 'student',
    studentId: studentId.trim()
  });
  return res.status(201).json({ success: true, data: { user: profile(user), token: tokenFor(user) } });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.trim().toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  return res.json({ success: true, data: { user: profile(user), token: tokenFor(user) } });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, data: { user: profile(req.user) } });
});

export default router;
