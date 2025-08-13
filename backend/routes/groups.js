const express = require('express');
const router = express.Router();
const {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  addHabitToGroup,
  getPublicGroups,
  findGroupByInviteCode
} = require('../controllers/groupController');
const auth = require('../middleware/auth');

// All routes are protected by JWT authentication
router.use(auth);

// @route   GET /api/groups/public
// @desc    Get public groups
// @access  Private
router.get('/public', getPublicGroups);

// @route   GET /api/groups/invite/:inviteCode
// @desc    Find group by invite code
// @access  Private
router.get('/invite/:inviteCode', findGroupByInviteCode);

// @route   GET /api/groups
// @desc    Get all groups for authenticated user
// @access  Private
router.get('/', getGroups);

// @route   GET /api/groups/:id
// @desc    Get single group by ID
// @access  Private
router.get('/:id', getGroup);

// @route   POST /api/groups
// @desc    Create new group
// @access  Private
router.post('/', createGroup);

// @route   PUT /api/groups/:id
// @desc    Update group
// @access  Private
router.put('/:id', updateGroup);

// @route   DELETE /api/groups/:id
// @desc    Delete group
// @access  Private
router.delete('/:id', deleteGroup);

// @route   POST /api/groups/:groupId/join
// @desc    Join a group
// @access  Private
router.post('/:groupId/join', joinGroup);

// @route   POST /api/groups/:groupId/leave
// @desc    Leave a group
// @access  Private
router.post('/:groupId/leave', leaveGroup);

// @route   POST /api/groups/:groupId/habits
// @desc    Add habit to group
// @access  Private
router.post('/:groupId/habits', addHabitToGroup);

module.exports = router;
