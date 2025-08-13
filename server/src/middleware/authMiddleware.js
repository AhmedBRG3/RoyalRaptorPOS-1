const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.admin) return res.status(403).json({ message: 'admin only' });
  next();
}

function requireFinance(req, res, next) {
  if (!(req.user?.finance || req.user?.admin)) return res.status(403).json({ message: 'finance only' });
  next();
}

module.exports = { requireAuth, requireAdmin, requireFinance };


