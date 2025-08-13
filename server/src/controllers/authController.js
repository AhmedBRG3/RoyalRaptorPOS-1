const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/config');

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, admin: !!user.admin, finance: !!user.finance }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function register(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'username and password required' });
    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'username already exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username: username.toLowerCase(), passwordHash, admin: false, finance: false });
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, username: user.username, admin: user.admin, finance: user.finance } });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { username, password, startingBalance = 0 } = req.body;
    const user = await User.findOne({ username: (username || '').toLowerCase() });
    if (!user) return res.status(401).json({ message: 'invalid credentials' });
    const ok = await user.comparePassword(password || '');
    if (!ok) return res.status(401).json({ message: 'invalid credentials' });
    const token = signToken(user);
    // close any previous open sessions for this user just in case
    await Session.updateMany({ user: user._id, isOpen: true }, { isOpen: false, endTime: new Date() });
    const session = await Session.create({ user: user._id, startingBalance: Number(startingBalance || 0), endingBalance: Number(startingBalance || 0), isOpen: true });
    res.json({ token, user: { id: user.id, username: user.username, admin: user.admin, finance: user.finance }, sessionId: session.id });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };


