const Progress = require('../models/Progress');
const Habit = require('../models/Habit');
const Group = require('../models/Group');

// @desc    Get user statistics for dashboard
// @route   GET /api/stats/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get active habits count
    const activeHabitsCount = await Habit.countDocuments({
      creator: userId,
      isActive: true
    });
    
    // Get groups count
    const groupsCount = await Group.countDocuments({
      members: userId,
      isActive: true
    });
    
    // Calculate overall streak (longest current streak across all habits)
    const activeHabits = await Habit.find({
      creator: userId,
      isActive: true
    });
    
    let longestCurrentStreak = 0;
    
    for (const habit of activeHabits) {
      try {
        const streak = await Progress.getCurrentStreak(userId, habit._id);
        longestCurrentStreak = Math.max(longestCurrentStreak, streak);
      } catch (error) {
        console.error(`Error calculating streak for habit ${habit._id}:`, error);
      }
    }
    
    // Get overall completion rate for the last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const progressEntries = await Progress.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    const totalEntries = progressEntries.length;
    const completedEntries = progressEntries.filter(entry => entry.completed).length;
    const weeklyCompletionRate = totalEntries > 0 ? 
      Math.round((completedEntries / totalEntries) * 100) : 0;
    
    res.status(200).json({
      success: true,
      data: {
        activeHabits: activeHabitsCount,
        groupsJoined: groupsCount,
        longestStreak: longestCurrentStreak,
        weeklyCompletionRate
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats
};
