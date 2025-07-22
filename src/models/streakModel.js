// models/streak.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dietStreakSchema = new Schema({
  daily_count: { type: Number, default: 0 },
  target: { type: Number, default: 3 },
  total_count: { type: Number, default: 0 },
  currentDailyStreak: { type: Number, default: 0 },
  currentWeeklyStreak: { type: Number, default: 0 },
  currentMonthlyStreak: { type: Number, default: 0 },
  dailyCompleted: { type: Boolean, default: false },
  // Changed to Date (or null) to record when monthly streak was last completed.
  lastMonthlyCompletedDate: { type: Date, default: null },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// models/streak.js (additional sub-schema for blood glucose)
const bloodGlucoseStreakSchema = new Schema({
    daily_count: { type: Number, default: 0 },
    targetDaily: { type: Number, default: 3 },    // "Log your blood glucose 3 times a day"
    targetWeekly: { type: Number, default: 18 },    // "Log blood glucose at least 18 times during the week"
    targetMonthly: { type: Number, default: 80 },   // "Log your blood glucose at least 80 times this month"
    total_count: { type: Number, default: 0 },
    currentDailyStreak: { type: Number, default: 0 },
    currentWeeklyStreak: { type: Number, default: 0 },
    currentMonthlyStreak: { type: Number, default: 0 },
    dailyCompleted: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
  });
  

const workoutStreakSchema = new Schema({
  daily_count: { type: Number, default: 0 },
  target: { type: Number, default: 1 },
  total_count: { type: Number, default: 0 },
  currentDailyStreak: { type: Number, default: 0 },
  currentWeeklyStreak: { type: Number, default: 0 },
  currentMonthlyStreak: { type: Number, default: 0 },
  // To help track weekly progress.
  weeklyDates: { type: [Date], default: [] },
  currentWeeklyStartDate: { type: Date, default: null },
  currentWeeklyEndDate: { type: Date, default: null },
  weeklyCompleted: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const coachConnectStreakSchema = new Schema({
  daily_count: { type: Number, default: 0 },
  target: { type: Number, default: 1 },
  total_count: { type: Number, default: 0 },
  currentDailyStreak: { type: Number, default: 0 },
  currentWeeklyStreak: { type: Number, default: 0 },
  currentMonthlyStreak: { type: Number, default: 0 },
  dailyCompleted: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const faceScanStreakSchema = new Schema({
  daily_count: { type: Number, default: 0 },
  target: { type: Number, default: 1 },
  total_count: { type: Number, default: 0 },
  currentDailyStreak: { type: Number, default: 0 },
  currentWeeklyStreak: { type: Number, default: 0 },
  currentMonthlyStreak: { type: Number, default: 0 },
  dailyCompleted: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const userStreakSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    dietLog: {
      type: dietStreakSchema,
      default: () => ({})
    },
    workout: {
      type: workoutStreakSchema,
      default: () => ({})
    },
    coachConnect: {
      type: coachConnectStreakSchema,
      default: () => ({})
    },
    faceScan: {
      type: faceScanStreakSchema,
      default: () => ({})
    },
    bloodGlucose: {
        type: bloodGlucoseStreakSchema,
        default: () => ({})
      },
    lastUpdated: { type: Date, default: Date.now }
  },
  {
    timestamps: true // Automatically adds createdAt and updatedAt fields.
  }
);

const UserStreak = mongoose.model('UserStreak', userStreakSchema);
module.exports = UserStreak;
