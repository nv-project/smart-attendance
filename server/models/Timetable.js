import mongoose from 'mongoose';

const timetableSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    batch: { type: String, required: true },
    room: { type: String, required: true, trim: true },
    day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], required: true },
    startTime: { type: String, required: true }, // "HH:MM" 24h
    endTime: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Timetable', timetableSchema);
