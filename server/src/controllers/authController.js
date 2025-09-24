const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const Setting = require('../models/Setting');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/config');

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, admin: !!user.admin, finance: !!user.finance }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function register(req, res, next) {
  try {
    console.log('[REGISTER] Request received:', {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url
    });
    
    const { username, password, masterPassword } = req.body;
    console.log('[REGISTER] Extracted data:', { username, password: password ? '[HIDDEN]' : 'undefined', masterPassword: masterPassword ? '[HIDDEN]' : 'undefined' });

    if (!username || !password || !masterPassword) {
      console.log('[REGISTER] Missing required fields:', { hasUsername: !!username, hasPassword: !!password, hasMasterPassword: !!masterPassword });
      return res.status(400).json({ message: 'username, password and masterPassword are required' });
    }

    const setting = await Setting.findOne();
    if (!setting) {
      return res.status(503).json({ message: 'Registration disabled: master password not configured' });
    }
    const isMasterOk = await bcrypt.compare(masterPassword, setting.masterPasswordHash);
    if (!isMasterOk) {
      return res.status(401).json({ message: 'invalid master password' });
    }
    
    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'username already exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username: username.toLowerCase(), passwordHash, admin: false, finance: false });
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, username: user.username, admin: user.admin, finance: user.finance } });
  } catch (err) {
    console.error('[REGISTER] Error:', err);
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { username, password, startingCash = 0, startingBank = 0 } = req.body;
    const user = await User.findOne({ username: (username || '').toLowerCase() });
    if (!user) return res.status(401).json({ message: 'invalid credentials' });
    const ok = await user.comparePassword(password || '');
    if (!ok) return res.status(401).json({ message: 'invalid credentials' });
    const token = signToken(user);
    // close any previous open sessions for this user just in case
    await Session.updateMany({ user: user._id, isOpen: true }, { isOpen: false, endTime: new Date() });
    const now = new Date();
    const session = await Session.create({ user: user._id, startingCash: Number(startingCash || 0), startingBank: Number(startingBank || 0), endingCash: Number(startingCash || 0), endingBank: Number(startingBank || 0), isOpen: true, startTime: now, lastPingAt: now });
    res.json({ token, user: { id: user.id, username: user.username, admin: user.admin, finance: user.finance }, sessionId: session.id });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };


