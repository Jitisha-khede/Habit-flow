const Group = require('../models/Group');
const User = require('../models/User');
const Habit = require('../models/Habit');

// @desc    Get all groups for authenticated user
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.user.userId,
      isActive: true
    })
    .populate('creator', 'username firstName lastName')
    .populate('members', 'username firstName lastName')
    .populate('habits', 'name frequency duration')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch groups',
      error: error.message
    });
  }
};

// @desc    Get single group by ID
// @route   GET /api/groups/:id
// @access  Private
const getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'username firstName lastName')
      .populate('members', 'username firstName lastName avatar')
      .populate('habits', 'name frequency duration goal category');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member of the group or if it's a public group
    const isMember = group.members.some(member => member._id.toString() === req.user.userId.toString());
    
    if (!isMember && group.isPrivate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this private group'
      });
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group',
      error: error.message
    });
  }
};

// @desc    Create new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
  try {
    const { name, description, isPrivate, maxMembers, tags } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    const group = new Group({
      name,
      description,
      creator: req.user.userId,
      members: [req.user.userId],
      isPrivate,
      maxMembers,
      tags
    });

    const savedGroup = await group.save();

    // Add group to user's joined groups
    await User.findByIdAndUpdate(
      req.user.userId,
      { $push: { joinedGroups: savedGroup._id } }
    );

    const populatedGroup = await Group.findById(savedGroup._id)
      .populate('creator', 'username firstName lastName')
      .populate('members', 'username firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: populatedGroup
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create group',
      error: error.message
    });
  }
};

// @desc    Update group
// @route   PUT /api/groups/:id
// @access  Private
const updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is the creator
    if (group.creator.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this group'
      });
    }

    const { name, description, isPrivate, maxMembers, tags, settings } = req.body;

    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        isPrivate,
        maxMembers,
        tags,
        settings
      },
      { new: true, runValidators: true }
    )
    .populate('creator', 'username firstName lastName')
    .populate('members', 'username firstName lastName')
    .populate('habits', 'name frequency duration');

    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      data: updatedGroup
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update group',
      error: error.message
    });
  }
};

// @desc    Delete group
// @route   DELETE /api/groups/:id
// @access  Private
const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is the creator
    if (group.creator.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this group'
      });
    }

    // Soft delete - mark as inactive
    await Group.findByIdAndUpdate(req.params.id, { isActive: false });

    // Remove group from all members' joined groups
    await User.updateMany(
      { joinedGroups: req.params.id },
      { $pull: { joinedGroups: req.params.id } }
    );

    res.status(200).json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete group',
      error: error.message
    });
  }
};

// @desc    Join a group
// @route   POST /api/groups/:groupId/join
// @access  Private
const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { inviteCode } = req.body;

    const group = await Group.findById(groupId);

    if (!group || !group.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is already a member
    if (group.members.includes(req.user.userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this group'
      });
    }

    // Check if group is full
    if (group.isFull) {
      return res.status(400).json({
        success: false,
        message: 'Group is full'
      });
    }

    // For private groups, check invite code
    if (group.isPrivate) {
      if (!inviteCode || inviteCode !== group.inviteCode) {
        return res.status(403).json({
          success: false,
          message: 'Invalid invite code for private group'
        });
      }
    }

    // Add user to group
    await group.addMember(req.user.userId);

    // Add group to user's joined groups
    await User.findByIdAndUpdate(
      req.user.userId,
      { $push: { joinedGroups: groupId } }
    );

    const updatedGroup = await Group.findById(groupId)
      .populate('creator', 'username firstName lastName')
      .populate('members', 'username firstName lastName')
      .populate('habits', 'name frequency duration');

    res.status(200).json({
      success: true,
      message: 'Successfully joined the group',
      data: {
        group: updatedGroup,
        canCreateHabits: updatedGroup.settings.allowMemberHabitCreation,
        hasNoHabits: updatedGroup.habitCount === 0,
        activityStatus: updatedGroup.activityStatus
      }
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join group',
      error: error.message
    });
  }
};

// @desc    Leave a group
// @route   POST /api/groups/:groupId/leave
// @access  Private
const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member
    if (!group.members.includes(req.user.userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // Check if user is the creator
    if (group.creator.toString() === req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Group creator cannot leave. Transfer ownership or delete the group.'
      });
    }

    // Remove user from group
    await group.removeMember(req.user.userId);

    // Remove group from user's joined groups
    await User.findByIdAndUpdate(
      req.user.userId,
      { $pull: { joinedGroups: groupId } }
    );

    res.status(200).json({
      success: true,
      message: 'Successfully left the group'
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave group',
      error: error.message
    });
  }
};

// @desc    Add habit to group
// @route   POST /api/groups/:groupId/habits
// @access  Private
const addHabitToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { habitId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member
    if (!group.members.includes(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add habits to this group'
      });
    }

    // Check if habit exists and user has access
    const habit = await Habit.findById(habitId);
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    // Check if user is the creator of the habit or if group allows member habit creation
    const isHabitCreator = habit.creator.toString() === req.user.userId.toString();
    const canAddHabit = isHabitCreator || group.settings.allowMemberHabitCreation;

    if (!canAddHabit) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add this habit to the group'
      });
    }

    // Add habit to group
    await group.addHabit(habitId);

    res.status(200).json({
      success: true,
      message: 'Habit added to group successfully'
    });
  } catch (error) {
    console.error('Add habit to group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add habit to group',
      error: error.message
    });
  }
};

// @desc    Get public groups
// @route   GET /api/groups/public
// @access  Private
const getPublicGroups = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    
    const groups = await Group.findPublic(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (error) {
    console.error('Get public groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public groups',
      error: error.message
    });
  }
};

// @desc    Find group by invite code
// @route   GET /api/groups/invite/:inviteCode
// @access  Private
const findGroupByInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.params;

    if (!inviteCode) {
      return res.status(400).json({
        success: false,
        message: 'Invite code is required'
      });
    }

    const group = await Group.findOne({
      inviteCode: inviteCode.toUpperCase(),
      isActive: true
    })
    .populate('creator', 'username firstName lastName')
    .populate('members', 'username firstName lastName');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'No group found with this invite code'
      });
    }

    // Check if user is already a member
    const isMember = group.members.some(member => member._id.toString() === req.user.userId.toString());
    
    res.status(200).json({
      success: true,
      data: {
        group,
        isMember,
        canJoin: !isMember && !group.isFull && group.isActive
      }
    });
  } catch (error) {
    console.error('Find group by invite code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find group',
      error: error.message
    });
  }
};

module.exports = {
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
};
