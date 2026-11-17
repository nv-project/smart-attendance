import { Router } from 'express';
import crypto from 'crypto';
import Session from '../models/Session.js';
import Course from '../models/Course.js';
import Attendance from '../models/Attendance.js';
import { protect, allow } from '../middleware/auth.js';

const router = Router();
router.use(protect, allow('teacher'));

const newCode = () => crypto.randomBytes(5).toString('hex');
const SESSION_MINUTES = 15;

const mine = (req) => ({ _id: req.params.id, teacher: req.user._id });

router.post('/start', async (req, res) => {
  const course = await Course.findOne({ _id: req.body.courseId, teacher: req.user._id });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  await Session.updateMany({ course: course._id, active: true }, { active: false });
  const session = await Session.create({
    course: course._id,
    teacher: req.user._id,
    code: newCode(),
    expiresAt: new Date(Date.now() + SESSION_MINUTES * 60000),
  });
  res.status(201).json(session);
});

// The teacher's screen calls this every ~15 seconds so a photographed QR stops working quickly.
router.post('/:id/refresh', async (req, res) => {
  const session = await Session.findOne({ ...mine(req), active: true, expiresAt: { $gt: new Date() } });
  if (!session) return res.status(404).json({ message: 'Session has ended' });
  session.prevCode = session.code;
  session.code = newCode();
  session.codeIssuedAt = new Date();
  await session.save();
  res.json(session);
});

router.post('/:id/end', async (req, res) => {
  const session = await Session.findOneAndUpdate(mine(req), { active: false }, { new: true });
  if (!session) return res.status(404).json({ message: 'Session not found' });
  res.json(session);
});

router.get('/:id', async (req, res) => {
  const session = await Session.findOne(mine(req)).populate('course', 'name code batch');
  if (!session) return res.status(404).json({ message: 'Session not found' });
  const present = await Attendance.find({ session: session._id }).populate('student', 'name email').sort('createdAt');
  res.json({ session, present });
});

export default router;
