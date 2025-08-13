const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  habit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit',
    required: [true, 'Habit reference is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: ''
  },
  value: {
    type: Number,
    min: [0, 'Value cannot be negative'],
    default: null
  },
  streak: {
    type: Number,
    min: [0, 'Streak cannot be negative'],
    default: 0
  },
  isLateEntry: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure one progress entry per user per habit per date
progressSchema.index({ habit: 1, user: 1, date: 1 }, { unique: true });

// Additional indexes for performance
progressSchema.index({ user: 1, completed: 1 });
progressSchema.index({ habit: 1, completed: 1 });
progressSchema.index({ date: -1 });
progressSchema.index({ user: 1, date: -1 });

// Virtual to check if entry was completed today
progressSchema.virtual('isToday').get(function() {
  const today = new Date();
  const entryDate = new Date(this.date);
  return today.toDateString() === entryDate.toDateString();
});

// Virtual to calculate days since completion
progressSchema.virtual('daysSinceCompletion').get(function() {
  if (!this.completed || !this.completedAt) return null;
  const today = new Date();
  const completedDate = new Date(this.completedAt);
  const diffTime = Math.abs(today - completedDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for formatted date
progressSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0]; // YYYY-MM-DD format
});

// Pre-save middleware
progressSchema.pre('save', function(next) {
  // Set completedAt when marking as completed
  if (this.completed && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Clear completedAt when marking as not completed
  if (!this.completed && this.completedAt) {
    this.completedAt = null;
  }
  
  // Check if this is a late entry (completed after the target date)
  if (this.completed && this.completedAt) {
    const targetDate = new Date(this.date);
    const completionDate = new Date(this.completedAt);
    
    // If completed on a different day than the target date
    targetDate.setHours(0, 0, 0, 0);
    completionDate.setHours(0, 0, 0, 0);
    
    this.isLateEntry = completionDate.getTime() !== targetDate.getTime();
  }
  
  // Normalize date to start of day to avoid time conflicts
  if (this.date) {
    const normalizedDate = new Date(this.date);
    normalizedDate.setHours(0, 0, 0, 0);
    this.date = normalizedDate;
  }
  
  next();
});

// Instance method to toggle completion
progressSchema.methods.toggleCompletion = function() {
  this.completed = !this.completed;
  return this.save();
};

// Instance method to mark as completed with optional value
progressSchema.methods.markCompleted = function(value = null, notes = '') {
  this.completed = true;
  this.completedAt = new Date();
  if (value !== null) this.value = value;
  if (notes) this.notes = notes;
  return this.save();
};

// Instance method to mark as not completed
progressSchema.methods.markIncomplete = function() {
  this.completed = false;
  this.completedAt = null;
  return this.save();
};

// Static method to get user's progress for a specific habit
progressSchema.statics.getUserHabitProgress = function(userId, habitId, startDate = null, endDate = null) {
  const query = { user: userId, habit: habitId };
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .sort({ date: -1 })
    .populate('habit', 'name frequency goal unit');
};

// Static method to get user's daily progress
progressSchema.statics.getUserDailyProgress = function(userId, date = new Date()) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  return this.find({
    user: userId,
    date: {
      $gte: targetDate,
      $lt: nextDay
    }
  })
  .populate('habit', 'name frequency goal unit category')
  .sort({ createdAt: 1 });
};

// Static method to calculate completion rate for a user and habit
progressSchema.statics.calculateCompletionRate = async function(userId, habitId, days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const totalEntries = await this.countDocuments({
    user: userId,
    habit: habitId,
    date: { $gte: startDate, $lte: endDate }
  });
  
  const completedEntries = await this.countDocuments({
    user: userId,
    habit: habitId,
    date: { $gte: startDate, $lte: endDate },
    completed: true
  });
  
  return totalEntries > 0 ? (completedEntries / totalEntries) * 100 : 0;
};

// Static method to get current streak for a user and habit
progressSchema.statics.getCurrentStreak = async function(userId, habitId) {
  const entries = await this.find({
    user: userId,
    habit: habitId
  })
  .sort({ date: -1 })
  .limit(365); // Check up to a year back
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (const entry of entries) {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === streak && entry.completed) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

// Static method to create or update progress entry
progressSchema.statics.createOrUpdate = async function(userId, habitId, date, completed, value = null, notes = '') {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const existingEntry = await this.findOne({
    user: userId,
    habit: habitId,
    date: {
      $gte: targetDate,
      $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) // Next day
    }
  });
  
  if (existingEntry) {
    existingEntry.completed = completed;
    if (value !== null) existingEntry.value = value;
    if (notes) existingEntry.notes = notes;
    // Update completedAt when marking as completed
    if (completed && !existingEntry.completedAt) {
      existingEntry.completedAt = new Date();
    } else if (!completed) {
      existingEntry.completedAt = null;
    }
    return existingEntry.save();
  } else {
    return this.create({
      user: userId,
      habit: habitId,
      date: targetDate,
      completed,
      value,
      notes,
      completedAt: completed ? new Date() : null
    });
  }
};

module.exports = mongoose.model('Progress', progressSchema);
