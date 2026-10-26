export function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

export function errorHandler(error, req, res, next) {
  console.error(error);
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'value';
    return res.status(409).json({ success: false, message: `${field} is already in use` });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: Object.values(error.errors).map((item) => item.message).join(', ') });
  }
  return res.status(500).json({ success: false, message: 'Unexpected server error' });
}
