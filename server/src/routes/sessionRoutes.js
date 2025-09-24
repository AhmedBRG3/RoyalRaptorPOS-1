const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const Session = require('../models/Session');

const router = express.Router();

// Heartbeat to keep session alive and verify it's still open
router.post('/heartbeat', requireAuth, async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return res.status(400).json({ message: 'Missing X-Session-Id header' });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (!session.isOpen) {
      return res.status(409).json({ message: 'Session is closed' });
    }
    // Optional ownership check: non-admins must ping only their session
    if (!req.user.admin && String(session.user) !== req.user.sub) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Touch the document to update updatedAt and lastPingAt
    const now = new Date();
    await Session.updateOne({ _id: session._id }, { $set: { updatedAt: now, lastPingAt: now } });

    res.json({ ok: true });
  } catch (e) { next(e); }
});

// List sessions (admin only) with auto-close for stale sessions
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const now = Date.now();
    const twoPingsMs = 30 * 60 * 1000; // 2 minutes (two missed 60s pings)

    // Close sessions that missed two pings: set isOpen=false and endTime=lastPingAt
    await Session.updateMany(
      {
        isOpen: true,
        lastPingAt: { $exists: true },
        $expr: { $gt: [ { $subtract: [ now, { $toLong: '$lastPingAt' } ] }, twoPingsMs ] }
      },
      [
        {
          $set: {
            isOpen: false,
            endTime: '$lastPingAt',
            updatedAt: new Date()
          }
        }
      ]
    );

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


