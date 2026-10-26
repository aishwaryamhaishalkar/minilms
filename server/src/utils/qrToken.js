import crypto from 'node:crypto';

export function createQrToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashQrToken(token) };
}

export function hashQrToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function expiryDate() {
  const seconds = Number.parseInt(process.env.QR_EXPIRY_SECONDS || '60', 10);
  return new Date(Date.now() + (Number.isFinite(seconds) ? seconds : 60) * 1000);
}

export function safeSession(session) {
  return {
    id: session._id,
    subject: session.subject,
    className: session.className,
    teacherId: session.teacherId,
    status: session.status,
    qrExpiresAt: session.qrExpiresAt,
    createdAt: session.createdAt,
    endedAt: session.endedAt
  };
}
