import Course from '../models/Course.js';
import { normalizeBatch } from '../utils/batch.js';

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { sendMail } from '../config/mail.js';

const router = Router();
const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const publicUser = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, batch: u.batch });

// Self-registration is for students and teachers only. Admins are created by the seed script.
router.post('/register', async (req, res) => {
  const { name, email, password, role, batch } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (!['student', 'teacher'].includes(role)) return res.status(400).json({ message: 'Choose student or teacher' });
  if (role === 'student' && !batch) return res.status(400).json({ message: 'Students must enter a batch, e.g. MCA-1-A' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'That email is already registered' });
  const user = await User.create({ name, email, password, role, batch: role === 'student' ? batch : undefined });
  res.status(201).json({ token: sign(user._id), user: publicUser(user) });
});

router.post('/register', async (req, res) => {
  const { name, email, password, role, batch } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (!['student', 'teacher'].includes(role)) return res.status(400).json({ message: 'Choose student or teacher' });
  const cleanBatch = role === 'student' ? normalizeBatch(batch) : undefined;
  if (role === 'student') {
    if (!cleanBatch) return res.status(400).json({ message: 'Please choose your batch' });
    if (!(await Course.exists({ batch: cleanBatch }))) return res.status(400).json({ message: 'That batch has no courses yet. Choose a batch from the list' });
  }
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'That email is already registered' });
  const user = await User.create({ name, email, password, role, batch: cleanBatch });
  res.status(201).json({ token: sign(user._id), user: publicUser(user) });
});

// Public: list of batches that have courses (used by the register form dropdown)
router.get('/batches', async (req, res) => {
  const batches = await Course.distinct('batch');
  res.json(batches.sort());
});

// Step 1: user enters email. Same reply every time, so nobody can find out which emails are registered.
router.post('/forgot-password', async (req, res) => {
  const reply = { message: 'If that email is registered, a reset link has been sent. It is valid for 15 minutes.' };
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase().trim() });
  if (!user) return res.json(reply);

  const token = crypto.randomBytes(32).toString('hex');
  user.resetTokenHash = hash(token); // only the hash is stored, never the token itself
  user.resetTokenExpires = new Date(Date.now() + 15 * 60000);
  await user.save();

  const base = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0];
  const link = `${base}/reset-password/${token}`;
  try {
    await sendMail({
      to: user.email,
      subject: 'Reset your Smart Attendance password',
      text: `Hi ${user.name},\n\nUse this link to set a new password (valid for 15 minutes):\n${link}\n\nIf you did not ask for this, ignore this email.`,
    });
  } catch (err) {
    console.error('Reset email failed:', err.message);
  }
  res.json(reply);
});

// Step 2: user opens the emailed link and sets a new password.
router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const user = await User.findOne({ resetTokenHash: hash(req.params.token), resetTokenExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one' });
  user.password = password;
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  res.json({ message: 'Password updated. You can sign in now.' });
});

router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));

export default router;