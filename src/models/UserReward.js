// models/UserReward.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dailyUserRewardSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  dailyPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  availableTasks: [{
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },
    completedAt: {
      type: Date
    },
    pointsEarned: {
      type: Number,
      required: true,
      min: 0
    },
    isCompleted:{
      type: Boolean,
      default: false
    }
  }],
  streakAchievements: [{
    streakType: { 
      type: String, 
      enum: ['daily','weekly', 'monthly'], 
      required: true 
    },
    achievedAt: { 
      type: Date, 
      required: true 
    },
    streakCount: { 
      type: Number, 
      required: true 
    },
    rewardPoints: { 
      type: Number, 
      required: true 
    }
  }],
  streakPointsEarned: {
    type: Number,
    default: 0,
    min: 0
  }
});

dailyUserRewardSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('DailyUserReward', dailyUserRewardSchema);
