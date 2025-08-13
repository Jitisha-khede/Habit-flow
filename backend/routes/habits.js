const express = require('express');
const router = express.Router();
const {
  getHabits,
  getHabit,
  createHabit,
  updateHabit,
  deleteHabit,
  getGroupHabits
} = require('../controllers/habitController');
const auth = require('../middleware/auth');

// All routes are protected by JWT authentication
router.use(auth);

// @route   GET /api/habits
// @desc    Get all habits for authenticated user
// @access  Private
router.get('/', getHabits);

// @route   GET /api/habits/group/:groupId
// @desc    Get all habits for a specific group
// @access  Private
router.get('/group/:groupId', getGroupHabits);

// @route   GET /api/habits/:id
// @desc    Get single habit by ID
// @access  Private
router.get('/:id', getHabit);

// @route   POST /api/habits
// @desc    Create new habit
// @access  Private
router.post('/', createHabit);

// @route   PUT /api/habits/:id
// @desc    Update habit
// @access  Private
router.put('/:id', updateHabit);

// @route   DELETE /api/habits/:id
// @desc    Delete habit
// @access  Private
router.delete('/:id', deleteHabit);

module.exports = router;
