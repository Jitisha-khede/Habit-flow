const express = require('express');
const router = express.Router();
const {
  logProgress,
  getHabitProgress,
  getDailyProgress,
  toggleProgress,
  getProgressStats,
  markCompleteToday
} = require('../controllers/progressController');
const auth = require('../middleware/auth');

// All routes are protected by JWT authentication
router.use(auth);

// @route   POST /api/progress/log
// @desc    Log habit progress
// @access  Private
router.post('/log', logProgress);

// @route   GET /api/progress/daily
// @desc    Get user's daily progress
// @access  Private
router.get('/daily', getDailyProgress);

// @route   GET /api/progress/stats
// @desc    Get user's overall progress statistics
// @access  Private
router.get('/stats', getProgressStats);

// @route   GET /api/progress/habit/:habitId
// @desc    Get user's progress for a specific habit
// @access  Private
router.get('/habit/:habitId', getHabitProgress);

// @route   POST /api/progress/complete-today
// @desc    Mark habit as complete for today
// @access  Private
router.post('/complete-today', markCompleteToday);

// @route   PUT /api/progress/:progressId/toggle
// @desc    Toggle habit completion
// @access  Private
router.put('/:progressId/toggle', toggleProgress);

module.exports = router;
