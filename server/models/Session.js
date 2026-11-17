import mongoose from 'mongoose';

// One live attendance session = one lecture. The QR code rotates every few seconds.
const sessionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true },
    prevCode: { type: String },
    codeIssuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

sessionSchema.index({ code: 1 });

export default mongoose.model('Session', sessionSchema);
