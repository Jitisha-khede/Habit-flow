const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
    maxlength: [100, 'Habit name cannot exceed 100 characters'],
    minlength: [1, 'Habit name must be at least 1 character']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  goal: {
    type: String,
    trim: true,
    maxlength: [100, 'Goal cannot exceed 100 characters'],
    default: ''
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    enum: {
      values: ['daily', 'weekly', 'monthly', 'custom'],
      message: 'Frequency must be one of: daily, weekly, monthly, custom'
    },
    lowercase: true
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 day'],
    max: [365, 'Duration cannot exceed 365 days']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters'],
    default: 'general'
  },
  targetValue: {
    type: Number,
    min: [0, 'Target value cannot be negative'],
    default: 1
  },
  unit: {
    type: String,
    trim: true,
    maxlength: [20, 'Unit cannot exceed 20 characters'],
    default: 'times'
  },
  completionDates: {
    type: [Date],
    default: [],
    validate: {
      validator: function(dates) {
        // Ensure no duplicate dates (same day)
        const dateStrings = dates.map(date => date.toISOString().split('T')[0]);
        return dateStrings.length === new Set(dateStrings).size;
      },
      message: 'Cannot have duplicate completion dates for the same day'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for habit completion percentage based on completion dates
habitSchema.virtual('completionRate').get(function() {
  if (!this.completionDates || this.completionDates.length === 0) return 0;
  
  // Calculate days since creation
  const daysSinceCreation = Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24)) + 1;
  const expectedCompletions = Math.min(daysSinceCreation, this.duration);
  
  if (expectedCompletions === 0) return 0;
  
  return Math.min((this.completionDates.length / expectedCompletions) * 100, 100);
});

// Virtual to check if habit is expired
habitSchema.virtual('isExpired').get(function() {
  if (!this.createdAt || !this.duration) return false;
  const expirationDate = new Date(this.createdAt);
  expirationDate.setDate(expirationDate.getDate() + this.duration);
  return new Date() > expirationDate;
});

// Virtual for current streak calculation
habitSchema.virtual('currentStreak').get(function() {
  if (!this.completionDates || this.completionDates.length === 0) return 0;
  
  // Sort dates in descending order
  const sortedDates = this.completionDates
    .map(date => new Date(date))
    .sort((a, b) => b - a);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let streak = 0;
  let checkDate = new Date(today);
  
  for (const completionDate of sortedDates) {
    const completionDay = new Date(completionDate);
    completionDay.setHours(0, 0, 0, 0);
    
    if (completionDay.getTime() === checkDate.getTime()) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (completionDay.getTime() === checkDate.getTime() + (24 * 60 * 60 * 1000)) {
      // Allow for yesterday if today is not completed yet
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
});

// Virtual to check if completed today
habitSchema.virtual('isCompletedToday').get(function() {
  if (!this.completionDates || this.completionDates.length === 0) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];
  
  return this.completionDates.some(date => {
    const dateString = new Date(date).toISOString().split('T')[0];
    return dateString === todayString;
  });
});

// Virtual for total completions
habitSchema.virtual('totalCompletions').get(function() {
  return this.completionDates ? this.completionDates.length : 0;
});

// Index for better query performance
habitSchema.index({ creator: 1, isActive: 1 });
habitSchema.index({ frequency: 1 });
habitSchema.index({ createdAt: -1 });

// Instance method to mark habit as completed for a specific date
habitSchema.methods.markCompleted = function(date = new Date()) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  // Check if already completed on this date
  const dateString = targetDate.toISOString().split('T')[0];
  const alreadyCompleted = this.completionDates.some(existingDate => {
    const existingDateString = new Date(existingDate).toISOString().split('T')[0];
    return existingDateString === dateString;
  });
  
  if (!alreadyCompleted) {
    this.completionDates.push(targetDate);
    // Sort dates to maintain order
    this.completionDates.sort((a, b) => a - b);
  }
  
  return this.save();
};

// Instance method to remove completion for a specific date
habitSchema.methods.removeCompletion = function(date = new Date()) {
  const targetDate = new Date(date);
  const dateString = targetDate.toISOString().split('T')[0];
  
  this.completionDates = this.completionDates.filter(existingDate => {
    const existingDateString = new Date(existingDate).toISOString().split('T')[0];
    return existingDateString !== dateString;
  });
  
  return this.save();
};

// Instance method to check if completed on a specific date
habitSchema.methods.isCompletedOnDate = function(date = new Date()) {
  const targetDate = new Date(date);
  const dateString = targetDate.toISOString().split('T')[0];
  
  return this.completionDates.some(existingDate => {
    const existingDateString = new Date(existingDate).toISOString().split('T')[0];
    return existingDateString === dateString;
  });
};

// Instance method to toggle completion for a specific date
habitSchema.methods.toggleCompletion = function(date = new Date()) {
  if (this.isCompletedOnDate(date)) {
    return this.removeCompletion(date);
  } else {
    return this.markCompleted(date);
  }
};

// Pre-save middleware to ensure consistency
habitSchema.pre('save', function(next) {
  // Ensure frequency is lowercase
  if (this.frequency) {
    this.frequency = this.frequency.toLowerCase();
  }
  next();
});

module.exports = mongoose.model('Habit', habitSchema);
