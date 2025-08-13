const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/statsController');
const auth = require('../middleware/auth');

// All routes are protected by JWT authentication
router.use(auth);

// @route   GET /api/stats/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/dashboard', getDashboardStats);

module.exports = router;
