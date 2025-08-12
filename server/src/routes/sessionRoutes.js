const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const Session = require('../models/Session');

const router = express.Router();

// List sessions (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const sessions = await Session.find().sort({ createdAt: -1 }).populate('user', 'username').populate('sales');
    res.json(sessions);
  } catch (e) { next(e); }
});

// Close session (admin or owner can close)
router.post('/:id/close', requireAuth, async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (!req.user.admin && String(session.user) !== req.user.sub) return res.status(403).json({ message: 'Forbidden' });
    session.isOpen = false;
    session.endTime = new Date();
    await session.save();
    res.json(session);
  } catch (e) { next(e); }
});

module.exports = router;


