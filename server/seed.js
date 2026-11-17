import 'dotenv/config';
import mongoose from 'mongoose';
import crypto from 'crypto';
import User from './models/User.js';
import Course from './models/Course.js';
import Timetable from './models/Timetable.js';
import Session from './models/Session.js';
import Attendance from './models/Attendance.js';

// Small seeded random generator so the demo data is the same every time you seed
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(2026);
const PASSWORD = 'password123';

await mongoose.connect(process.env.MONGO_URI);
await Promise.all([User, Course, Timetable, Session, Attendance].map((m) => m.deleteMany({})));

// ---------- People ----------
await User.create({ name: 'Admin', email: 'admin@college.edu', password: PASSWORD, role: 'admin' });

const teacherDefs = {
  mehta: ['Prof. Mehta', 'teacher@college.edu'],
  sharma: ['Prof. Sharma', 'prof.sharma@college.edu'],
  iyer: ['Prof. Iyer', 'prof.iyer@college.edu'],
  desai: ['Prof. Desai', 'prof.desai@college.edu'],
};
const teachers = {};
for (const [key, [name, email]] of Object.entries(teacherDefs)) {
  teachers[key] = await User.create({ name, email, password: PASSWORD, role: 'teacher' });
}

const rosters = {
  'MCA-1-A': ['Riya Shah', 'Kunal Patel', 'Aarav Joshi', 'Isha Trivedi', 'Dev Parmar', 'Meera Nair', 'Rohan Kapoor', 'Ananya Bhatt', 'Harsh Vyas', 'Pooja Rana'],
  'MCA-1-B': ['Siddharth Jain', 'Neha Gupta', 'Yash Thakkar', 'Kavya Menon', 'Jay Solanki', 'Tanvi Pillai', 'Arjun Reddy', 'Sneha Kulkarni', 'Mihir Dave', 'Zoya Khan'],
};
const lowAttenders = { kunal: 0.58, dev: 0.5, harsh: 0.66, jay: 0.55 }; // chance of being present
const studentsByBatch = {};
for (const [batch, names] of Object.entries(rosters)) {
  studentsByBatch[batch] = [];
  for (const name of names) {
    const first = name.split(' ')[0].toLowerCase();
    const user = await User.create({ name, email: `${first}@college.edu`, password: PASSWORD, role: 'student', batch });
    const p = lowAttenders[first] ?? (first === 'riya' ? 0.96 : 0.82 + rand() * 0.16);
    studentsByBatch[batch].push({ user, p });
  }
}

// ---------- Courses ----------
const subjects = [
  { name: 'Computer Networks', base: 'CN101', teacher: 'mehta' },
  { name: 'Web Technologies', base: 'WT102', teacher: 'mehta' },
  { name: 'Python Programming', base: 'PY103', teacher: 'sharma' },
  { name: 'Database Management Systems', base: 'DB104', teacher: 'iyer' },
  { name: 'Data Structures', base: 'DS105', teacher: 'desai' },
];
const courses = [];
for (const batch of Object.keys(rosters)) {
  for (const s of subjects) {
    courses.push(
      await Course.create({ name: s.name, code: `${s.base}-${batch.slice(-1)}`, batch, teacher: teachers[s.teacher]._id })
    );
  }
}

// ---------- Timetable (3 lectures a week per course, no clashes) ----------
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOTS = [['09:00', '10:00'], ['10:00', '11:00'], ['11:15', '12:15'], ['12:15', '13:15'], ['14:00', '15:00'], ['15:00', '16:00']];
const roomsFor = (batch) => (batch.endsWith('A') ? ['101', '102', 'Lab 1'] : ['201', '202', 'Lab 1']);
const busy = new Set();
const isFree = (day, slot, key) => !busy.has(`${day}|${slot}|${key}`);
const take = (day, slot, key) => busy.add(`${day}|${slot}|${key}`);

const timetable = [];
courses.forEach((c, ci) => {
  const usedDays = new Set();
  for (let k = 0; k < 3; k++) {
    let placed = false;
    for (let j = 0; j < 6 && !placed; j++) {
      const day = DAYS[(ci + k * 2 + j) % 6];
      if (usedDays.has(day)) continue;
      for (let si = 0; si < SLOTS.length && !placed; si++) {
        const slot = (si + ci + k) % SLOTS.length;
        const room = roomsFor(c.batch).find((r) => isFree(day, slot, `room:${r}`));
        if (!room || !isFree(day, slot, `teacher:${c.teacher}`) || !isFree(day, slot, `batch:${c.batch}`)) continue;
        take(day, slot, `room:${room}`); take(day, slot, `teacher:${c.teacher}`); take(day, slot, `batch:${c.batch}`);
        usedDays.add(day);
        placed = true;
        timetable.push({ course: c._id, teacher: c.teacher, batch: c.batch, room, day, startTime: SLOTS[slot][0], endTime: SLOTS[slot][1] });
      }
    }
  }
});
await Timetable.insertMany(timetable);

// ---------- Past lectures and attendance ----------
const sessions = [];
const marks = [];
for (const c of courses) {
  const roster = studentsByBatch[c.batch];
  for (let i = 0; i < 12; i++) {
    const when = new Date(Date.now() - (2 + i * 2) * 86400000);
    when.setHours(9 + (i % 6), 0, 0, 0);
    const _id = new mongoose.Types.ObjectId();
    sessions.push({
      _id, course: c._id, teacher: c.teacher,
      code: crypto.randomBytes(5).toString('hex'),
      expiresAt: new Date(+when + 15 * 60000), active: false, createdAt: when, updatedAt: when,
    });
    for (const { user, p } of roster) {
      if (rand() < p + (rand() - 0.5) * 0.1) {
        const at = new Date(+when + (1 + rand() * 8) * 60000);
        marks.push({ session: _id, course: c._id, student: user._id, createdAt: at, updatedAt: at });
      }
    }
  }
}
await Session.insertMany(sessions, { timestamps: false });
await Attendance.insertMany(marks, { timestamps: false });

console.log(`Seeded: ${courses.length} courses, ${timetable.length} timetable slots, ${sessions.length} lectures, ${marks.length} attendance records.`);
console.log(`All passwords: ${PASSWORD}`);
console.log('Admin: admin@college.edu | Teacher: teacher@college.edu | Students: riya@, kunal@ (A) and siddharth@ (B) college.edu');
process.exit(0);