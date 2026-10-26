import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  markedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['present'], default: 'present' }
});

recordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

export default mongoose.model('AttendanceRecord', recordSchema);
