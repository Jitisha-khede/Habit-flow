const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters'],
    minlength: [1, 'Group name must be at least 1 character']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  habits: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit'
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  maxMembers: {
    type: Number,
    min: [1, 'Maximum members must be at least 1'],
    max: [1000, 'Maximum members cannot exceed 1000'],
    default: 50
  },
  inviteCode: {
    type: String,
    sparse: true,
    trim: true,
    maxlength: [20, 'Invite code cannot exceed 20 characters']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  settings: {
    allowMemberInvites: {
      type: Boolean,
      default: true
    },
    allowMemberHabitCreation: {
      type: Boolean,
      default: true
    },
    requireApprovalForJoining: {
      type: Boolean,
      default: false
    }
  },
  statistics: {
    totalHabitsCompleted: {
      type: Number,
      default: 0,
      min: [0, 'Statistics cannot be negative']
    },
    totalStreaks: {
      type: Number,
      default: 0,
      min: [0, 'Statistics cannot be negative']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for member count
groupSchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});

// Virtual for habit count
groupSchema.virtual('habitCount').get(function() {
  return this.habits ? this.habits.length : 0;
});

// Virtual to check if group is full
groupSchema.virtual('isFull').get(function() {
  return this.memberCount >= this.maxMembers;
});

// Virtual for group activity status
groupSchema.virtual('activityStatus').get(function() {
  if (!this.isActive) return 'inactive';
  if (this.memberCount === 0) return 'empty';
  if (this.habitCount === 0) return 'no-habits';
  return 'active';
});

// Indexes for better query performance
groupSchema.index({ creator: 1, isActive: 1 });
groupSchema.index({ members: 1 });
groupSchema.index({ isPrivate: 1, isActive: 1 });
groupSchema.index({ tags: 1 });
groupSchema.index({ inviteCode: 1 });
groupSchema.index({ createdAt: -1 });

// Pre-save middleware
groupSchema.pre('save', function(next) {
  // Generate invite code if not exists and group is not private
  if (!this.inviteCode && !this.isPrivate) {
    this.inviteCode = this.generateInviteCode();
  }
  
  // Ensure creator is in members array
  if (this.creator && (!this.members || !this.members.includes(this.creator))) {
    if (!this.members) this.members = [];
    this.members.push(this.creator);
  }
  
  // Remove duplicates from members array
  if (this.members && this.members.length > 0) {
    this.members = [...new Set(this.members.map(member => member.toString()))];
  }
  
  // Remove duplicates from habits array
  if (this.habits && this.habits.length > 0) {
    this.habits = [...new Set(this.habits.map(habit => habit.toString()))];
  }
  
  next();
});

// Instance method to generate invite code
groupSchema.methods.generateInviteCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Instance method to add member
groupSchema.methods.addMember = function(userId) {
  if (this.isFull) {
    throw new Error('Group is full');
  }
  
  if (!this.members.includes(userId)) {
    this.members.push(userId);
  }
  
  return this.save();
};

// Instance method to remove member
groupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => !member.equals(userId));
  return this.save();
};

// Instance method to add habit
groupSchema.methods.addHabit = function(habitId) {
  if (!this.habits.includes(habitId)) {
    this.habits.push(habitId);
  }
  
  return this.save();
};

// Instance method to remove habit
groupSchema.methods.removeHabit = function(habitId) {
  this.habits = this.habits.filter(habit => !habit.equals(habitId));
  return this.save();
};

// Static method to find groups by member
groupSchema.statics.findByMember = function(userId) {
  return this.find({ 
    members: userId, 
    isActive: true 
  }).populate('creator', 'username firstName lastName')
    .populate('members', 'username firstName lastName')
    .populate('habits', 'name frequency duration');
};

// Static method to find public groups
groupSchema.statics.findPublic = function(limit = 20) {
  return this.find({ 
    isPrivate: false, 
    isActive: true 
  })
  .limit(limit)
  .sort({ createdAt: -1 })
  .populate('creator', 'username firstName lastName')
  .populate('members', 'username firstName lastName');
};

module.exports = mongoose.model('Group', groupSchema);
