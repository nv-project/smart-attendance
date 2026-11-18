import { normalizeBatch } from '../utils/batch.js';
import { Router } from 'express';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Timetable from '../models/Timetable.js';
import { protect, allow } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', async (req, res) => {
  const { role, _id, batch } = req.user;
  const filter = role === 'teacher' ? { teacher: _id } : role === 'student' ? { batch } : {};
  res.json(await Course.find(filter).populate('teacher', 'name email').sort('code'));
});

router.get('/teachers', allow('admin'), async (req, res) => {
  res.json(await User.find({ role: 'teacher' }).select('name email').sort('name'));
});

router.post('/', allow('admin'), async (req, res) => {
  const { name, code, batch, teacher } = req.body;
  if (!name || !code || !batch || !teacher) return res.status(400).json({ message: 'All fields are required' });
  try {
    const course = await Course.create({ name, code, batch: normalizeBatch(batch), teacher });
    res.status(201).json(await course.populate('teacher', 'name email'));
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'A course with that code already exists' });
    throw err;
  }
});

router.delete('/:id', allow('admin'), async (req, res) => {
  await Timetable.deleteMany({ course: req.params.id });
  await Course.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
