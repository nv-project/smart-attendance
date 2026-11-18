import { Router } from 'express';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Attendance from '../models/Attendance.js';
import { protect, allow } from '../middleware/auth.js';
import { normalizeBatch } from '../utils/batch.js';

const router = Router();
router.use(protect, allow('admin'));

const findUser = async (id) => {
  const user = await User.findById(id);
  return user && user.role !== 'admin' ? user : null;
};

router.get('/', async (req, res) => {
  res.json(await User.find({ role: { $ne: 'admin' } }).select('name email role batch').sort('role name'));
});

// Change a student's batch
router.patch('/:id', async (req, res) => {
  const user = await findUser(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.role === 'student' && req.body.batch) user.batch = normalizeBatch(req.body.batch);
  await user.save();
  res.json({ _id: user._id, batch: user.batch });
});

// Set a new password for someone who forgot theirs
router.post('/:id/reset-password', async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const user = await findUser(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.password = password;
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  res.json({ message: 'Password updated' });
});

router.delete('/:id', async (req, res) => {
  const user = await findUser(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.role === 'teacher' && (await Course.exists({ teacher: user._id }))) {
    return res.status(409).json({ message: 'This teacher still has courses. Delete or reassign them first' });
  }
  await Attendance.deleteMany({ student: user._id });
  await user.deleteOne();
  res.json({ ok: true });
});

export default router;