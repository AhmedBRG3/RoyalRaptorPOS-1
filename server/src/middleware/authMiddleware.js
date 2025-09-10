const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');

function requireAuth(req, res, next) {
  console.log('[AUTH] requireAuth middleware called');
  console.log('[AUTH] Request headers:', req.headers);
  
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  
  console.log('[AUTH] Authorization header:', auth);
  console.log('[AUTH] Token extracted:', token ? 'present' : 'missing');
  
  if (!token) {
    console.log('[AUTH] No token found, returning 401');
    return res.status(401).json({ message: 'missing token' });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    console.log('[AUTH] Token verified successfully:', { sub: payload.sub, username: payload.username });
    req.user = payload;
    next();
  } catch (e) {
    console.log('[AUTH] Token verification failed:', e.message);
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

function requireAdminOrEditPassword(req, res, next) {
  // Allow admins directly
  if (req.user?.admin) return next();

  const provided = (req.headers['x-edit-password'] || req.body?.editPassword || req.query?.editPassword || '').toString();
  const expected = (process.env.EDIT_PASSWORD || 'OMar23').toString();

  if (!provided) return res.status(403).json({ message: 'admin or edit password required' });

  if (provided === expected) return next();

  return res.status(401).json({ message: 'invalid edit password' });
}

module.exports = { requireAuth, requireAdmin, requireFinance, requireAdminOrEditPassword };


