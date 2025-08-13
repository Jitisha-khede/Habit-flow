const Habit = require('../models/Habit');
const Group = require('../models/Group');
const User = require('../models/User');

// @desc    Get all habits for authenticated user
// @route   GET /api/habits
// @access  Private
const getHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ 
      creator: req.user.userId,
      isActive: true 
    })
    .populate('creator', 'username firstName lastName')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: habits.length,
      data: habits
    });
  } catch (error) {
    console.error('Get habits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch habits',
      error: error.message
    });
  }
};

// @desc    Get single habit by ID
// @route   GET /api/habits/:id
// @access  Private
const getHabit = async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id)
      .populate('creator', 'username firstName lastName');

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    // Check if user is the creator or member of a group that has this habit
    const isCreator = habit.creator._id.toString() === req.user.userId.toString();
    let isMember = false;

    if (!isCreator) {
      const groups = await Group.find({
        habits: habit._id,
        members: req.user.userId,
        isActive: true
      });
      isMember = groups.length > 0;
    }

    if (!isCreator && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this habit'
      });
    }

    res.status(200).json({
      success: true,
      data: habit
    });
  } catch (error) {
    console.error('Get habit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch habit',
      error: error.message
    });
  }
};

// @desc    Create new habit
// @route   POST /api/habits
// @access  Private
const createHabit = async (req, res) => {
  try {
    const { name, description, goal, frequency, duration, category, targetValue, unit } = req.body;

    // Validate required fields
    if (!name || !frequency || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Name, frequency, and duration are required'
      });
    }

    const habit = new Habit({
      name,
      description,
      creator: req.user.userId,
      goal,
      frequency: frequency.toLowerCase(),
      duration,
      category,
      targetValue,
      unit
    });

    const savedHabit = await habit.save();

    // Add habit to user's created habits
    await User.findByIdAndUpdate(
      req.user.userId,
      { $push: { createdHabits: savedHabit._id } }
    );

    const populatedHabit = await Habit.findById(savedHabit._id)
      .populate('creator', 'username firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Habit created successfully',
      data: populatedHabit
    });
  } catch (error) {
    console.error('Create habit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create habit',
      error: error.message
    });
  }
};

// @desc    Update habit
// @route   PUT /api/habits/:id
// @access  Private
const updateHabit = async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    // Check if user is the creator
    if (habit.creator.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this habit'
      });
    }

    const { name, description, goal, frequency, duration, category, targetValue, unit, isActive } = req.body;

    const updatedHabit = await Habit.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        goal,
        frequency: frequency ? frequency.toLowerCase() : habit.frequency,
        duration,
        category,
        targetValue,
        unit,
        isActive
      },
      { new: true, runValidators: true }
    ).populate('creator', 'username firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Habit updated successfully',
      data: updatedHabit
    });
  } catch (error) {
    console.error('Update habit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update habit',
      error: error.message
    });
  }
};

// @desc    Delete habit
// @route   DELETE /api/habits/:id
// @access  Private
const deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    // Check if user is the creator
    if (habit.creator.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this habit'
      });
    }

    // Soft delete - mark as inactive
    await Habit.findByIdAndUpdate(req.params.id, { isActive: false });

    // Remove from user's created habits
    await User.findByIdAndUpdate(
      req.user.userId,
      { $pull: { createdHabits: req.params.id } }
    );

    // Remove from all groups
    await Group.updateMany(
      { habits: req.params.id },
      { $pull: { habits: req.params.id } }
    );

    res.status(200).json({
      success: true,
      message: 'Habit deleted successfully'
    });
  } catch (error) {
    console.error('Delete habit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete habit',
      error: error.message
    });
  }
};

// @desc    Get habits for a specific group
// @route   GET /api/habits/group/:groupId
// @access  Private
const getGroupHabits = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member of the group
    if (!group.members.includes(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this group\'s habits'
      });
    }

    // Get all habits for the group
    const habits = await Habit.find({
      _id: { $in: group.habits },
      isActive: true
    })
    .populate('creator', 'username firstName lastName')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: habits.length,
      data: {
        group: {
          id: group._id,
          name: group.name,
          description: group.description
        },
        habits
      }
    });
  } catch (error) {
    console.error('Get group habits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group habits',
      error: error.message
    });
  }
};

module.exports = {
  getHabits,
  getHabit,
  createHabit,
  updateHabit,
  deleteHabit,
  getGroupHabits
};
