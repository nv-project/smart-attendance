import { Router } from 'express';
import Timetable from '../models/Timetable.js';
import Course from '../models/Course.js';
import { protect, allow } from '../middleware/auth.js';

const router = Router();
router.use(protect);

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Core feature: two lectures clash when they are on the same day, their times overlap,
// and they share the same teacher, the same room, or the same batch.
async function findClashes(course, { room, day, startTime, endTime }) {
  const s = toMin(startTime);
  const e = toMin(endTime);
  const sameDay = await Timetable.find({ day }).populate('course', 'code');
  const clashes = [];
  for (const t of sameDay) {
    const overlaps = s < toMin(t.endTime) && e > toMin(t.startTime);
    if (!overlaps) continue;
    const when = `${t.course.code} on ${day}, ${t.startTime}-${t.endTime}`;
    if (String(t.teacher) === String(course.teacher)) clashes.push(`Teacher is already teaching ${when}`);
    if (t.room.toLowerCase() === room.toLowerCase()) clashes.push(`Room ${t.room} is already booked for ${when}`);
    if (t.batch === course.batch) clashes.push(`Batch ${course.batch} already has ${when}`);
  }
  return clashes;
}

router.get('/', async (req, res) => {
  const { role, _id, batch } = req.user;
  const filter = role === 'teacher' ? { teacher: _id } : role === 'student' ? { batch } : {};
  const rows = await Timetable.find(filter).populate('course', 'name code').populate('teacher', 'name');
  res.json(rows.sort((a, b) => a.startTime.localeCompare(b.startTime)));
});

router.post('/', allow('admin'), async (req, res) => {
  const { courseId, room, day, startTime, endTime } = req.body;
  if (!courseId || !room || !day || !startTime || !endTime) return res.status(400).json({ message: 'All fields are required' });
  if (toMin(startTime) >= toMin(endTime)) return res.status(400).json({ message: 'End time must be after start time' });
  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ message: 'Course not found' });

  const clashes = await findClashes(course, { room, day, startTime, endTime });
  if (clashes.length) return res.status(409).json({ message: 'Timetable clash found', clashes });

  const entry = await Timetable.create({ course: course._id, teacher: course.teacher, batch: course.batch, room, day, startTime, endTime });
  res.status(201).json(entry);
});

router.delete('/:id', allow('admin'), async (req, res) => {
  await Timetable.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
