import { Router } from 'express';
import mongoose from 'mongoose';
import AttendanceSession from '../models/AttendanceSession.js';
import AttendanceRecord from '../models/AttendanceRecord.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createQrToken, expiryDate, hashQrToken } from '../utils/qrToken.js';
import { rememberToken } from '../utils/qrMemory.js';

const router = Router();
router.use(requireAuth);

function isTransactionUnsupported(error) {
  return error.code === 20 || /transaction|replica set|mongos/i.test(error.message || '');
}

async function createAttendance(session, studentId, token) {
  const nextQr = createQrToken();
  const nextExpiry = expiryDate();
  const filter = {
    _id: session._id,
    status: 'active',
    currentQrTokenHash: hashQrToken(token),
    qrExpiresAt: { $gt: new Date() }
  };
  const dbSession = await mongoose.startSession();
  try {
    try {
      dbSession.startTransaction();
      const claimed = await AttendanceSession.findOneAndUpdate(
        filter,
        { $set: { currentQrTokenHash: nextQr.hash, qrExpiresAt: nextExpiry } },
        { new: true, session: dbSession }
      );
      if (!claimed) {
        await dbSession.abortTransaction();
        return { error: { status: 410, message: 'QR code is expired, invalid, or already used' } };
      }
      try {
        await AttendanceRecord.create([{ sessionId: session._id, studentId }], { session: dbSession });
      } catch (error) {
        if (error.code === 11000) {
          await dbSession.abortTransaction();
          return { error: { status: 409, message: 'Attendance has already been marked for this session' } };
        }
        throw error;
      }
      await dbSession.commitTransaction();
      rememberToken(session._id, nextQr.token);
      return { nextQr, nextExpiry };
    } catch (error) {
      if (dbSession.inTransaction()) await dbSession.abortTransaction();
      if (!isTransactionUnsupported(error)) throw error;
    }

    const claimed = await AttendanceSession.findOneAndUpdate(filter, {
      $set: { currentQrTokenHash: nextQr.hash, qrExpiresAt: nextExpiry }
    }, { new: true });
    if (!claimed) return { error: { status: 410, message: 'QR code is expired, invalid, or already used' } };
    try {
      await AttendanceRecord.create({ sessionId: session._id, studentId });
    } catch (error) {
      if (error.code === 11000) return { error: { status: 409, message: 'Attendance has already been marked for this session' } };
      await AttendanceSession.updateOne(
        { _id: session._id, currentQrTokenHash: nextQr.hash },
        { $set: { currentQrTokenHash: hashQrToken(token), qrExpiresAt: session.qrExpiresAt } }
      );
      throw error;
    }
    rememberToken(session._id, nextQr.token);
    return { nextQr, nextExpiry };
  } finally {
    await dbSession.endSession();
  }
}

router.post('/scan', requireRole('student'), asyncHandler(async (req, res) => {
  const { sessionId, token } = req.body;
  if (!mongoose.isValidObjectId(sessionId) || typeof token !== 'string' || !token) {
    return res.status(400).json({ success: false, message: 'A valid session ID and QR token are required' });
  }
  const session = await AttendanceSession.findById(sessionId);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.status !== 'active') return res.status(410).json({ success: false, message: 'This attendance session has ended' });
  const alreadyMarked = await AttendanceRecord.exists({ sessionId, studentId: req.user._id });
  if (alreadyMarked) return res.status(409).json({ success: false, message: 'Attendance has already been marked for this session' });
  const result = await createAttendance(session, req.user._id, token);
  if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });
  return res.json({
    success: true,
    message: 'Attendance marked successfully',
    data: { sessionId, qr: { token: result.nextQr.token, expiresAt: result.nextExpiry } }
  });
}));

router.get('/my', requireRole('student'), asyncHandler(async (req, res) => {
  const records = await AttendanceRecord.find({ studentId: req.user._id })
    .populate('sessionId', 'subject className createdAt')
    .sort({ markedAt: -1 });
  res.json({ success: true, data: { records } });
}));

router.get('/summary', asyncHandler(async (req, res) => {
  const totalSessions = await AttendanceSession.countDocuments({});
  const attended = await AttendanceRecord.countDocuments({ studentId: req.user._id });
  const percentage = totalSessions ? Math.round((attended / totalSessions) * 100) : 0;
  res.json({ success: true, data: { totalSessions, attended, percentage } });
}));

router.get('/reports', requireRole('teacher'), asyncHandler(async (req, res) => {
  const sessionFilter = {};
  if (req.query.sessionId && mongoose.isValidObjectId(req.query.sessionId)) sessionFilter._id = req.query.sessionId;
  const sessions = await AttendanceSession.find({ ...sessionFilter, teacherId: req.user._id }).select('_id subject className');
  const records = await AttendanceRecord.find({ sessionId: { $in: sessions.map((item) => item._id) } })
    .populate('studentId', 'name studentId')
    .populate('sessionId', 'subject className')
    .sort({ markedAt: -1 });
  res.json({ success: true, data: { records } });
}));

export default router;
