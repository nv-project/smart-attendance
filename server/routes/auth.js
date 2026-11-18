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

const CODE_MINUTES = 10;

// Step 1: user enters email. We email a 6-digit code. Same reply every time.
router.post('/forgot-password', async (req, res) => {
  const reply = { message: `If that email is registered, a 6-digit code has been sent. It is valid for ${CODE_MINUTES} minutes.` };
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase().trim() });
  if (!user) return res.json(reply);

  // Don't send another code if one went out less than a minute ago
  const sentAt = user.resetTokenExpires ? user.resetTokenExpires.getTime() - CODE_MINUTES * 60000 : 0;
  if (Date.now() - sentAt < 60000) return res.json(reply);

  const code = String(crypto.randomInt(100000, 1000000));
  user.resetTokenHash = hash(code); // only the hash is stored
  user.resetTokenExpires = new Date(Date.now() + CODE_MINUTES * 60000);
  user.resetAttempts = 0;
  await user.save();

  try {
    await sendMail({
      to: user.email,
      subject: 'Your Smart Attendance code',
      text: `Hi ${user.name},\n\nYour code is: ${code}\n\nIt is valid for ${CODE_MINUTES} minutes. If you did not ask for this, ignore this email.`,
    });
  } catch (err) {
    console.error('Reset email failed:', err.message);
  }
  res.json(reply);
});

// Step 2: user sends email + code + new password. If the code is right, they are signed in.
router.post('/reset-password', async (req, res) => {
  const { email, code, password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const bad = { message: 'That code is wrong or has expired. Request a new code if needed.' };

  const user = await User.findOne({ email: (email || '').toLowerCase().trim() });
  if (!user || !user.resetTokenHash || user.resetTokenExpires < new Date() || user.resetAttempts >= 5) {
    return res.status(400).json(bad);
  }
  if (hash(String(code || '').trim()) !== user.resetTokenHash) {
    user.resetAttempts += 1;
    if (user.resetAttempts >= 5) {
      user.resetTokenHash = undefined; // too many wrong tries: the code is dead
      user.resetTokenExpires = undefined;
    }
    await user.save();
    return res.status(400).json(bad);
  }

  user.password = password;
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  user.resetAttempts = 0;
  await user.save();
  res.json({ token: sign(user._id), user: publicUser(user) });
});

router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));

export default router;