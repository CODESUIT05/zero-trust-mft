// backend/src/routes/auth.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { login, refresh } = require('../controllers/auth.controller');

// ✅ Public routes (no auth required)
router.post('/login', login);
router.post('/refresh', refresh);

// ✅ Protected routes example (for future expansion)
// router.get('/me', verifyToken, (req, res) => {
//   res.json({ success: true, data: { id: req.user.id, email: req.user.email } });
// });

module.exports = router;