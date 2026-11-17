import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// A student can be marked only once per session
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
