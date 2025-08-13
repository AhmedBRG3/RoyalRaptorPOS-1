const express = require('express');
const { register, login } = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

module.exports = router;

// Admin-only user management
router.get('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 });
    res.json(users);
  } catch (e) { next(e); }
});

router.put('/users/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = {};
    if (typeof req.body.admin === 'boolean') updates.admin = req.body.admin;
    if (typeof req.body.finance === 'boolean') updates.finance = req.body.finance;
    if (req.body.password) {
      const bcrypt = require('bcrypt');
      updates.passwordHash = await bcrypt.hash(req.body.password, 10);
    }
    const user = await User.findByIdAndUpdate(id, updates, { new: true, select: '-passwordHash' });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e) { next(e); }
});

// Per-user print settings
router.get('/print-settings', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).select('printSettings');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.printSettings || {});
  } catch (e) { next(e); }
});

router.put('/print-settings', requireAuth, async (req, res, next) => {
  try {
    const allowed = [
      'labelWidthMm','labelHeightMm','rotateDegrees','hPaddingPct','vPaddingPct','dpi','forcePortraitPage','pageOrientation','printAsImage',
      // USB printing
      'usbEnabled','usbVendorId','usbProductId','usbCommandLanguage','usbDebugEnabled','usbTryAllEndpoints'
    ];
    const updates = {};
    for (const key of allowed) {
      if (!(key in req.body)) continue;
      let val = req.body[key];
      // Keep VID/PID as-is (string); just trim
      if (key === 'usbVendorId' || key === 'usbProductId') {
        if (val === null || typeof val === 'undefined') continue;
        val = String(val).trim();
      }
      updates[`printSettings.${key}`] = val;
    }
    const user = await User.findByIdAndUpdate(req.user.sub, { $set: updates }, { new: true, select: 'printSettings' });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.printSettings || {});
  } catch (e) { next(e); }
});


