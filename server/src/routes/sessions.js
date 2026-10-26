import { Router } from 'express';
import mongoose from 'mongoose';
import AttendanceSession from '../models/AttendanceSession.js';
import AttendanceRecord from '../models/AttendanceRecord.js';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createQrToken, expiryDate, safeSession } from '../utils/qrToken.js';
import { forgetToken, readToken, rememberToken } from '../utils/qrMemory.js';

const router = Router();
router.use(requireAuth);

function ownerFilter(req, id) {
  return req.user.role === 'teacher' ? { _id: id, teacherId: req.user._id } : { _id: id };
}

async function findOwnedSession(req, id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return AttendanceSession.findOne(ownerFilter(req, id));
}

function issueToken(session) {
  const qr = createQrToken();
  session.currentQrTokenHash = qr.hash;
  session.qrExpiresAt = expiryDate();
  rememberToken(session._id, qr.token);
  return { qr, expiresAt: session.qrExpiresAt };
}

router.get('/dashboard', requireRole('teacher'), asyncHandler(async (req, res) => {
  const [students, sessions, active, recent] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    AttendanceSession.countDocuments({ teacherId: req.user._id }),
    AttendanceSession.countDocuments({ teacherId: req.user._id, status: 'active' }),
    AttendanceSession.find({ teacherId: req.user._id }).sort({ createdAt: -1 }).limit(10)
  ]);
  res.json({ success: true, data: { students, sessions, active, recent: recent.map(safeSession) } });
}));

router.post('/', requireRole('teacher'), asyncHandler(async (req, res) => {
  const { subject, className } = req.body;
  if (!subject?.trim() || !className?.trim()) return res.status(400).json({ success: false, message: 'Subject and class name are required' });
  const session = await AttendanceSession.create({ subject: subject.trim(), className: className.trim(), teacherId: req.user._id });
  res.status(201).json({ success: true, data: { session: safeSession(session) } });
}));

router.get('/', asyncHandler(async (req, res) => {
  const filter = req.user.role === 'teacher' ? { teacherId: req.user._id } : {};
  const sessions = await AttendanceSession.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: { sessions: sessions.map(safeSession) } });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const session = await findOwnedSession(req, req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  const count = await AttendanceRecord.countDocuments({ sessionId: session._id });
  res.json({ success: true, data: { session: safeSession(session), attendanceCount: count } });
}));

router.post('/:id/start', requireRole('teacher'), asyncHandler(async (req, res) => {
  const session = await findOwnedSession(req, req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.status === 'active') return res.status(409).json({ success: false, message: 'Session is already active' });
  if (session.endedAt) return res.status(409).json({ success: false, message: 'Ended sessions cannot be restarted' });
  session.status = 'active';
  const { qr, expiresAt } = issueToken(session);
  await session.save();
  res.json({ success: true, data: { session: safeSession(session), qr: { token: qr.token, expiresAt } } });
}));

router.post('/:id/refresh-qr', requireRole('teacher'), asyncHandler(async (req, res) => {
  const session = await findOwnedSession(req, req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.status !== 'active') return res.status(409).json({ success: false, message: 'Only active sessions can refresh QR codes' });
  const { qr, expiresAt } = issueToken(session);
  await session.save();
  res.json({ success: true, data: { qr: { token: qr.token, expiresAt } } });
}));

router.get('/:id/current-qr', requireRole('teacher'), asyncHandler(async (req, res) => {
  const session = await findOwnedSession(req, req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.status !== 'active') return res.status(409).json({ success: false, message: 'Session is not active' });
  if (!session.currentQrTokenHash || !session.qrExpiresAt || session.qrExpiresAt <= new Date() || !readToken(session._id)) {
    const { qr, expiresAt } = issueToken(session);
    await session.save();
    return res.json({ success: true, data: { qr: { token: qr.token, expiresAt } } });
  }
  return res.json({ success: true, data: { qr: { token: readToken(session._id), expiresAt: session.qrExpiresAt } } });
}));

router.post('/:id/end', requireRole('teacher'), asyncHandler(async (req, res) => {
  const session = await findOwnedSession(req, req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.status !== 'active') return res.status(409).json({ success: false, message: 'Session is not active' });
  session.status = 'ended';
  session.endedAt = new Date();
  session.currentQrTokenHash = null;
  session.qrExpiresAt = null;
  forgetToken(session._id);
  await session.save();
  res.json({ success: true, data: { session: safeSession(session) } });
}));

router.get('/:id/attendance', requireRole('teacher'), asyncHandler(async (req, res) => {
  const session = await findOwnedSession(req, req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  const records = await AttendanceRecord.find({ sessionId: session._id }).populate('studentId', 'name studentId email').sort({ markedAt: -1 });
  res.json({ success: true, data: { records } });
}));

export default router;
