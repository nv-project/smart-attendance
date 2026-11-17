import { Router } from 'express';
import Session from '../models/Session.js';
import Course from '../models/Course.js';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import { protect, allow } from '../middleware/auth.js';

const router = Router();
router.use(protect);

// Student scans the QR (or types the code). The previous code stays valid for 10 seconds
// so a scan that started just before a refresh still works.
router.post('/mark', allow('student'), async (req, res) => {
  const code = String(req.body.code || '').trim();
  if (!code) return res.status(400).json({ message: 'No code received' });
  const now = new Date();
  const session = await Session.findOne({
    active: true,
    expiresAt: { $gt: now },
    $or: [{ code }, { prevCode: code, codeIssuedAt: { $gt: new Date(now - 10000) } }],
  }).populate('course', 'name code batch');

  if (!session) return res.status(400).json({ message: 'This QR code is invalid or has expired. Scan the latest one' });
  if (session.course.batch !== req.user.batch) return res.status(403).json({ message: 'You are not enrolled in this course' });

  try {
    await Attendance.create({ session: session._id, course: session.course._id, student: req.user._id });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Your attendance is already marked for this lecture' });
    throw err;
  }
  res.status(201).json({ message: `Marked present in ${session.course.name}`, course: session.course });
});

// Student: percentage per course
router.get('/my', allow('student'), async (req, res) => {
  const courses = await Course.find({ batch: req.user.batch }).sort('code');
  const rows = await Promise.all(
    courses.map(async (c) => {
      const total = await Session.countDocuments({ course: c._id });
      const attended = await Attendance.countDocuments({ course: c._id, student: req.user._id });
      return { course: { _id: c._id, name: c.name, code: c.code }, total, attended, percent: total ? Math.round((attended / total) * 100) : 0 };
    })
  );
  res.json(rows);
});

// Teacher: per-student report for one course
async function buildReport(courseId, teacherId) {
  const course = await Course.findOne({ _id: courseId, teacher: teacherId });
  if (!course) return null;
  const total = await Session.countDocuments({ course: course._id });
  const students = await User.find({ role: 'student', batch: course.batch }).select('name email').sort('name');
  const counts = await Attendance.aggregate([
    { $match: { course: course._id } },
    { $group: { _id: '$student', n: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.n]));
  const rows = students.map((s) => {
    const attended = map.get(String(s._id)) || 0;
    return { student: s, attended, percent: total ? Math.round((attended / total) * 100) : 0 };
  });
  return { course, total, rows };
}

router.get('/course/:courseId', allow('teacher'), async (req, res) => {
  const report = await buildReport(req.params.courseId, req.user._id);
  if (!report) return res.status(404).json({ message: 'Course not found' });
  res.json(report);
});

router.get('/course/:courseId/csv', allow('teacher'), async (req, res) => {
  const report = await buildReport(req.params.courseId, req.user._id);
  if (!report) return res.status(404).json({ message: 'Course not found' });
  const lines = ['Name,Email,Attended,Total,Percent'];
  report.rows.forEach((r) => lines.push(`"${r.student.name}",${r.student.email},${r.attended},${report.total},${r.percent}`));
  res.type('text/csv').attachment(`${report.course.code}-attendance.csv`).send(lines.join('\n'));
});

export default router;
