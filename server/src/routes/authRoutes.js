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
    if (req.body.password) {
      const bcrypt = require('bcrypt');
      updates.passwordHash = await bcrypt.hash(req.body.password, 10);
    }
    const user = await User.findByIdAndUpdate(id, updates, { new: true, select: '-passwordHash' });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e) { next(e); }
});


