import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  subject: { type: String, required: true, trim: true, maxlength: 120 },
  className: { type: String, required: true, trim: true, maxlength: 120 },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['active', 'ended'], default: 'ended' },
  currentQrTokenHash: { type: String, default: null },
  qrExpiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null }
});

export default mongoose.model('AttendanceSession', sessionSchema);
