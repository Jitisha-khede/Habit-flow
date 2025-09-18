const Progress = require('../models/Progress');
const Habit = require('../models/Habit');
const Group = require('../models/Group');

// @desc    Log habit progress
// @route   POST /api/progress/log
// @access  Private
const logProgress = async (req, res) => {
  try {
    const { habitId, date, completed = true, value, notes } = req.body;

    // Validate required fields
    if (!habitId) {
      return res.status(400).json({
        success: false,
        message: 'Habit ID is required'
      });
    }

    // Check if habit exists and user has access to it
    const habit = await Habit.findById(habitId);
    
    if (!habit || !habit.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    // Check if user is the creator or member of a group that has this habit
    const isCreator = habit.creator.toString() === req.user.userId.toString();
    let isMember = false;

    if (!isCreator) {
      const groups = await Group.find({
        habits: habitId,
        members: req.user.userId,
        isActive: true
      });
      isMember = groups.length > 0;
    }

    if (!isCreator && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to log progress for this habit'
      });
    }

    // Use provided date or current date (normalize to start of day in local timezone)
    const targetDate = date ? new Date(date) : new Date();
    // Normalize to start of day to avoid timezone issues
    targetDate.setHours(0, 0, 0, 0);

    // Create or update progress entry
    const progress = await Progress.createOrUpdate(
      req.user.userId,
      habitId,
      targetDate,
      completed,
      value,
      notes
    );

    // Populate the progress with habit details
    const populatedProgress = await Progress.findById(progress._id)
      .populate('habit', 'name frequency goal unit category')
      .populate('user', 'username firstName lastName');

    res.status(200).json({
      success: true,
      message: `Progress ${progress.completed ? 'logged' : 'updated'} successfully`,
      data: populatedProgress
    });
  } catch (error) {
    console.error('Log progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log progress',
      error: error.message
    });
  }
};

// @desc    Get user's progress for a specific habit
// @route   GET /api/progress/habit/:habitId
// @access  Private
const getHabitProgress = async (req, res) => {
  try {
    const { habitId } = req.params;
    const { startDate, endDate, limit = 30 } = req.query;

    // Check if habit exists and user has access
    const habit = await Habit.findById(habitId);
    
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    // Check authorization
    const isCreator = habit.creator.toString() === req.user.userId.toString();
    let isMember = false;

    if (!isCreator) {
      const groups = await Group.find({
        habits: habitId,
        members: req.user.userId,
        isActive: true
      });
      isMember = groups.length > 0;
    }

    if (!isCreator && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view progress for this habit'
      });
    }

    // Get progress entries
    const progressEntries = await Progress.getUserHabitProgress(
      req.user.userId, 
      habitId, 
      startDate, 
      endDate
    ).limit(parseInt(limit));

    // Calculate statistics
    const totalEntries = progressEntries.length;
    const completedEntries = progressEntries.filter(entry => entry.completed).length;
    const completionRate = totalEntries > 0 ? (completedEntries / totalEntries) * 100 : 0;
    const currentStreak = await Progress.getCurrentStreak(req.user.userId, habitId);

    res.status(200).json({
      success: true,
      data: {
        habit: {
          id: habit._id,
          name: habit.name,
          frequency: habit.frequency,
          goal: habit.goal
        },
        statistics: {
          totalEntries,
          completedEntries,
          completionRate: Math.round(completionRate * 100) / 100,
          currentStreak
        },
        progress: progressEntries
      }
    });
  } catch (error) {
    console.error('Get habit progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch habit progress',
      error: error.message
    });
  }
};

// @desc    Get user's daily progress
// @route   GET /api/progress/daily
// @access  Private
const getDailyProgress = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const progressEntries = await Progress.getUserDailyProgress(req.user.userId, targetDate);

    // Group by completion status
    const completed = progressEntries.filter(entry => entry.completed);
    const pending = progressEntries.filter(entry => !entry.completed);

    res.status(200).json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        summary: {
          total: progressEntries.length,
          completed: completed.length,
          pending: pending.length,
          completionRate: progressEntries.length > 0 
            ? Math.round((completed.length / progressEntries.length) * 100) 
            : 0
        },
        progress: {
          completed,
          pending
        }
      }
    });
  } catch (error) {
    console.error('Get daily progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily progress',
      error: error.message
    });
  }
};

// @desc    Toggle habit completion
// @route   PUT /api/progress/:progressId/toggle
// @access  Private
const toggleProgress = async (req, res) => {
  try {
    const { progressId } = req.params;

    const progress = await Progress.findById(progressId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress entry not found'
      });
    }

    // Check if user owns this progress entry
    if (progress.user.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this progress entry'
      });
    }

    await progress.toggleCompletion();

    const updatedProgress = await Progress.findById(progressId)
      .populate('habit', 'name frequency goal unit')
      .populate('user', 'username firstName lastName');

    res.status(200).json({
      success: true,
      message: `Progress marked as ${updatedProgress.completed ? 'completed' : 'incomplete'}`,
      data: updatedProgress
    });
  } catch (error) {
    console.error('Toggle progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle progress',
      error: error.message
    });
  }
};

// @desc    Get user's overall progress statistics
// @route   GET /api/progress/stats
// @access  Private
const getProgressStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user.userId;

    // Get date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get all progress entries for the period
    const progressEntries = await Progress.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    }).populate('habit', 'name category frequency');

    // Calculate statistics
    const totalEntries = progressEntries.length;
    const completedEntries = progressEntries.filter(entry => entry.completed).length;
    const overallCompletionRate = totalEntries > 0 ? (completedEntries / totalEntries) * 100 : 0;

    // Group by habit
    const habitStats = {};
    progressEntries.forEach(entry => {
      const habitId = entry.habit._id.toString();
      if (!habitStats[habitId]) {
        habitStats[habitId] = {
          habit: entry.habit,
          total: 0,
          completed: 0
        };
      }
      habitStats[habitId].total++;
      if (entry.completed) {
        habitStats[habitId].completed++;
      }
    });

    // Convert to array and add completion rates
    const habitStatsArray = Object.values(habitStats).map(stat => ({
      ...stat,
      completionRate: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0
    }));

    // Get active habits count
    const activeHabits = await Habit.countDocuments({
      creator: userId,
      isActive: true
    });

    res.status(200).json({
      success: true,
      data: {
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days: parseInt(days)
        },
        overall: {
          activeHabits,
          totalEntries,
          completedEntries,
          completionRate: Math.round(overallCompletionRate * 100) / 100
        },
        habitBreakdown: habitStatsArray
      }
    });
  } catch (error) {
    console.error('Get progress stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress statistics',
      error: error.message
    });
  }
};

// @desc    Mark habit as complete for today
// @route   POST /api/progress/complete-today
// @access  Private
const markCompleteToday = async (req, res) => {
  try {
    const { habitId } = req.body;

    if (!habitId) {
      return res.status(400).json({
        success: false,
        message: 'Habit ID is required'
      });
    }

    // Check if habit exists and user has access to it
    const habit = await Habit.findById(habitId);
    if (!habit || !habit.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    // Check if user is the creator or member of a group that has this habit
    const isCreator = habit.creator.toString() === req.user.userId.toString();
    let isMember = false;
    if (!isCreator) {
      const groups = await Group.find({
        habits: habitId,
        members: req.user.userId,
        isActive: true
      });
      isMember = groups.length > 0;
    }
    if (!isCreator && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to log progress for this habit'
      });
    }

    // Normalize today's date to start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already completed today
    const existing = await Progress.findOne({
      user: req.user.userId,
      habit: habitId,
      date: today,
      completed: true
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Habit already completed today'
      });
    }

    // Create or update progress entry for today
    const progress = await Progress.createOrUpdate(
      req.user.userId,
      habitId,
      today,
      true // completed
    );

    res.status(200).json({
      success: true,
      message: 'Habit marked as complete for today!',
      data: progress
    });
  } catch (error) {
    console.error('Mark complete error:', err?.response?.data || err);
    res.status(500).json({
      success: false,
      message: 'Failed to mark habit as complete',
      error: error.message
    });
  }
};

module.exports = {
  logProgress,
  getHabitProgress,
  getDailyProgress,
  toggleProgress,
  getProgressStats,
  markCompleteToday
};
