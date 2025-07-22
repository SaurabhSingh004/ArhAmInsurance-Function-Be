// services/StreakService.js
const streakModel = require('../models/streakModel');
const moment = require('moment');
const UserRewardService = require('./UseRewardsService');
const TaskService = require('./TaskService');

class StreakService {
  // ----------------------
  // Helper Methods
  // ----------------------

  // Check if two dates fall in the same week.
  static isInSameWeek(date1, date2) {
    return moment(date1).isSame(moment(date2), 'week');
  }

  // Return the number of days in the month for the given date.
  static getDaysInCurrentMonth(date) {
    return moment(date).daysInMonth();
  }

  // Check if two dates are in the same month.
  static async isSameMonth(date1, date2) {
    return moment(date1).isSame(moment(date2), 'month');
  }

  // ----------------------
  // Diet Log Streak Sync
  // ----------------------
  static async syncDietLogStreakData(userId, currentDate) {
    console.log(`Sync DietLog started for userId: ${userId}, date: ${currentDate}`);
    const today = moment(currentDate).startOf('day');
    let streak = await streakModel.findOne({ userId });

    if (!streak) {
      console.log(`No streak found for userId: ${userId}. Creating new dietLog streak.`);
      const newStreak = new streakModel({
        userId,
        dietLog: {
          daily_count: 1,
          total_count: 1,
          target: 3, // Daily target: log 3 times per day
          currentDailyStreak: 0,
          currentWeeklyStreak: 0,
          currentMonthlyStreak: 0,
          dailyCompleted: false,
          lastMonthlyCompletedDate: null,
          lastUpdated: Date.now(),
          createdAt: Date.now()
        },
        lastUpdated: Date.now()
      });
      streak = await newStreak.save();
      return streak;
    }

    console.log(`DietLog streak found for userId: ${userId}.`);
    const lastUpdated = moment(streak.dietLog.lastUpdated).startOf('day');
    console.log(`Last updated: ${lastUpdated.format()}, Today: ${today.format()}`);

    if (today.isSame(lastUpdated, 'day')) {
      streak.dietLog.daily_count += 1;
      console.log(`Same day: daily_count increased to ${streak.dietLog.daily_count}`);
    } else if (today.diff(lastUpdated, 'days') === 1) {
      console.log(`Consecutive day: resetting daily_count to 1`);
      streak.dietLog.daily_count = 1;
      streak.dietLog.dailyCompleted = false;
    } else {
      console.log(`Inactivity detected: resetting dietLog streaks`);
      streak.dietLog.daily_count = 1;
      streak.dietLog.currentDailyStreak = 0;
      streak.dietLog.currentWeeklyStreak = 0;
      streak.dietLog.currentMonthlyStreak = 0;
      streak.dietLog.dailyCompleted = false;
    }

    // When daily target is met, mark as complete and update daily streak.
    if (!streak.dietLog.dailyCompleted && streak.dietLog.daily_count >= streak.dietLog.target) {
      streak.dietLog.dailyCompleted = true;
      const mealReward = await TaskService.getTaskByFeatureType("Food Logging");
      await UserRewardService.updateDailyTaskCompletion(userId, mealReward._id, mealReward.points);

      streak.dietLog.currentDailyStreak += 1;
      console.log(`DietLog daily streak achieved. currentDailyStreak: ${streak.dietLog.currentDailyStreak}`);
      // Award daily achievement (20 points)
      await UserRewardService.addStreakAchievement(userId, 'daily', streak.dietLog.currentDailyStreak, 20);

      // Every 7 consecutive daily completions, update weekly streak.
      if (streak.dietLog.currentDailyStreak % 7 === 0) {
        streak.dietLog.currentWeeklyStreak += 1;
        console.log(`DietLog weekly streak achieved. currentWeeklyStreak: ${streak.dietLog.currentWeeklyStreak}`);
        await UserRewardService.addStreakAchievement(userId, 'weekly', streak.dietLog.currentWeeklyStreak, 50);
      }
    }

    streak.dietLog.total_count += 1;
    console.log(`DietLog total_count incremented to ${streak.dietLog.total_count}`);

    // If total_count threshold is reached within the same month, update monthly streak.
    if (streak.dietLog.total_count >= 75 && await StreakService.isSameMonth(Date.now(), streak.dietLog.createdAt)) {
      streak.dietLog.currentMonthlyStreak += 1;
      console.log(`DietLog monthly streak achieved. currentMonthlyStreak: ${streak.dietLog.currentMonthlyStreak}`);
      await UserRewardService.addStreakAchievement(userId, 'monthly', streak.dietLog.currentMonthlyStreak, 100);
    }

    streak.dietLog.lastUpdated = Date.now();
    console.log(`DietLog sync completed for userId: ${userId}. Saving changes.`);
    await streak.save();
    return streak;
  }

  // ----------------------
  // Workout Streak Sync
  // ----------------------
  static async syncWorkoutStreakData(userId, currentDate) {
    console.log(`Sync Workout started for userId: ${userId}, date: ${currentDate}`);
    const today = moment(currentDate).startOf('day');
    const currentWeekStart = moment(currentDate).startOf('week');
    const currentWeekEnd = moment(currentWeekStart).add(6, 'days');
    let streak = await streakModel.findOne({ userId });

    if (!streak) {
      console.log(`No streak found for userId: ${userId}. Creating new workout streak.`);
      const newStreak = new streakModel({
        userId,
        workout: {
          daily_count: 1,
          target: 1,
          total_count: 1,
          currentDailyStreak: 1,
          currentWeeklyStreak: 0,
          currentMonthlyStreak: 0,
          weeklyCompleted: false,
          completedWeeklyStartDate: null,
          completedWeeklyEndDate: null,
          lastUpdated: Date.now(),
          createdAt: Date.now(),
          weeklyDates: [today.toDate()],
          currentWeeklyStartDate: currentWeekStart.toDate(),
          currentWeeklyEndDate: currentWeekEnd.toDate()
        }
      });
      streak = await newStreak.save();
      return streak;
    }

    console.log(`Workout streak found for userId: ${userId}.`);
    const lastUpdated = moment(streak.workout.lastUpdated).startOf('day');
    streak.workout.lastUpdated = Date.now();
    streak.workout.daily_count = today.isSame(lastUpdated, 'day') ? streak.workout.daily_count + 1 : 1;
    streak.workout.total_count += 1;
    if (today.diff(lastUpdated, 'days') === 1) {
      streak.workout.currentDailyStreak += 1;
    } else if (today.diff(lastUpdated, 'days') > 1) {
      streak.workout.currentDailyStreak = 1;
    }

    if (!streak.workout.weeklyDates.some(date => moment(date).isSame(today, 'day'))) {
      streak.workout.weeklyDates.push(today.toDate());
    }

    if (!moment(streak.workout.currentWeeklyStartDate).isSame(currentWeekStart, 'week')) {
      const previousWeekCompleted = streak.workout.weeklyDates.length >= 5;
      if (previousWeekCompleted) {
        streak.workout.currentWeeklyStreak += 1;
        streak.workout.completedWeeklyStartDate = streak.workout.currentWeeklyStartDate;
        streak.workout.completedWeeklyEndDate = streak.workout.currentWeeklyEndDate;
        console.log(`Workout weekly streak achieved. currentWeeklyStreak: ${streak.workout.currentWeeklyStreak}`);
        await UserRewardService.addStreakAchievement(userId, 'weekly', streak.workout.currentWeeklyStreak, 50);
      } else {
        streak.workout.currentWeeklyStreak = 0;
      }
      streak.workout.weeklyDates = [today.toDate()];
      streak.workout.currentWeeklyStartDate = currentWeekStart.toDate();
      streak.workout.currentWeeklyEndDate = currentWeekEnd.toDate();
      streak.workout.weeklyCompleted = false;
    }

    if (streak.workout.total_count >= 20 && await StreakService.isSameMonth(Date.now(), streak.workout.createdAt)) {
      streak.workout.currentMonthlyStreak += 1;
      console.log(`Workout monthly streak achieved. currentMonthlyStreak: ${streak.workout.currentMonthlyStreak}`);
      await UserRewardService.addStreakAchievement(userId, 'monthly', streak.workout.currentMonthlyStreak, 100);
    }

    await streak.save();
    return streak;
  }

  // ----------------------
  // CoachConnect Streak Sync
  // ----------------------
  static async syncCoachConnectStreakData(userId, currentDate) {
    console.log(`Sync CoachConnect started for userId: ${userId}, date: ${currentDate}`);
    const today = moment(currentDate).startOf('day');
    let streak = await streakModel.findOne({ userId });
    if (!streak) {

      const newStreak = new streakModel({
        userId,
        coachConnect: {
          daily_count: 1,
          target: 1,
          total_count: 1,
          currentDailyStreak: 1,
          currentWeeklyStreak: 0,
          currentMonthlyStreak: 0,
          dailyCompleted: true,
          lastUpdated: Date.now(),
          createdAt: Date.now()
        }
      });

      const coachConnectReward = await TaskService.getTaskByFeatureType("Coaching");
      await UserRewardService.updateDailyTaskCompletion(userId, coachConnectReward._id, coachConnectReward.points);
      streak = await newStreak.save();
      return streak;
    } else if (!streak.coachConnect || streak.coachConnect.daily_count == 0) {
      console.log(`Streak exists but coachConnect data missing for userId: ${userId}. Initializing coachConnect.`);
      streak = await streakModel.findOneAndUpdate(
        { userId },
        {
          $set: {
            coachConnect: {
              daily_count: 1,
              target: 1,
              total_count: 1,
              currentDailyStreak: 1,
              currentWeeklyStreak: 0,
              currentMonthlyStreak: 0,
              dailyCompleted: true,
              lastUpdated: Date.now(),
              createdAt: Date.now()
            }
          }
        },
        { new: true }
      );

      const coachConnectReward = await TaskService.getTaskByFeatureType("Coaching");
      await UserRewardService.updateDailyTaskCompletion(userId, coachConnectReward._id, coachConnectReward.points);
      return streak;
    }

    console.log(`CoachConnect streak found for userId: ${userId}.`);
    const lastUpdated = moment(streak.coachConnect.lastUpdated).startOf('day');
    console.log(`Last updated: ${lastUpdated.format()}, Today: ${today.format()}`);

    if (today.diff(lastUpdated, 'days') > 1) {
      console.log(`A day was missed. Resetting CoachConnect streak.`);
      const coachConnectReward = await TaskService.getTaskByFeatureType("Coaching");
      await UserRewardService.updateDailyTaskCompletion(userId, coachConnectReward._id, coachConnectReward.points);
      streak = await streakModel.findOneAndUpdate(
        { userId },
        {
          $set: {
            'coachConnect.daily_count': 1,
            'coachConnect.currentDailyStreak': 1,
            'coachConnect.currentWeeklyStreak': 0,
            'coachConnect.currentMonthlyStreak': 0,
            'coachConnect.lastUpdated': Date.now()
          },
          $inc: { 'coachConnect.total_count': 1 }
        },
        { new: true }
      );
      return streak;
    }

    if (today.isSame(lastUpdated, 'day')) {
      streak.coachConnect.daily_count += 1;
      streak.coachConnect.lastUpdated = Date.now();
      console.log(`CoachConnect daily_count updated to ${streak.coachConnect.daily_count}`);
    } else if (today.diff(lastUpdated, 'days') === 1) {
      streak.coachConnect.daily_count = 1;
      streak.coachConnect.dailyCompleted = true;
      streak.coachConnect.lastUpdated = Date.now();
      streak.coachConnect.currentDailyStreak += 1;
      const coachConnectReward = await TaskService.getTaskByFeatureType("Coaching");
      await UserRewardService.updateDailyTaskCompletion(userId, coachConnectReward._id, coachConnectReward.points);
      console.log(`CoachConnect new day: currentDailyStreak is ${streak.coachConnect.currentDailyStreak}`);
    }

    streak.coachConnect.total_count += 1;
    if (streak.coachConnect.currentDailyStreak !=0 && streak.coachConnect.currentDailyStreak % 7 === 0) {
        streak.coachConnect.currentWeeklyStreak += 1;
        console.log(`CoachConnect weekly streak achieved. currentWeeklyStreak: ${streak.coachConnect.currentWeeklyStreak}`);
        await UserRewardService.addStreakAchievement(userId, 'weekly', streak.coachConnect.currentWeeklyStreak, 50);
    }

    const daysInCurrentMonth = moment(currentDate).daysInMonth();
    if ((streak.coachConnect.currentDailyStreak + 1) >= daysInCurrentMonth &&
        await StreakService.isSameMonth(Date.now(), streak.coachConnect.createdAt)) {
      streak.coachConnect.currentMonthlyStreak += 1;
      console.log(`CoachConnect monthly streak achieved. currentMonthlyStreak: ${streak.coachConnect.currentMonthlyStreak}`);
      await UserRewardService.addStreakAchievement(userId, 'monthly', streak.coachConnect.currentMonthlyStreak, 100);
    }

    await streak.save();
    return streak;
  }

  // ----------------------
  // FaceScan Streak Sync
  // ----------------------
  static async syncFaceScanStreakData(userId, currentDate) {
    console.log(`Sync FaceScan started for userId: ${userId}, date: ${currentDate}`);
    const today = moment(currentDate).startOf('day');
    let streak = await streakModel.findOne({ userId });

    if (!streak) {
      console.log(`No streak found for userId: ${userId}. Creating new faceScan streak.`);
      const newStreak = new streakModel({
        userId,
        faceScan: {
          daily_count: 1,
          target: 1,
          total_count: 1,
          currentDailyStreak: 1,
          currentWeeklyStreak: 0,
          currentMonthlyStreak: 0,
          dailyCompleted: true,
          lastUpdated: Date.now(),
          createdAt: Date.now()
        }
      });
      streak = await newStreak.save();
      return streak;
    } else if (!streak.faceScan) {
      console.log(`Streak exists but faceScan data missing for userId: ${userId}. Initializing faceScan.`);
      streak = await streakModel.findOneAndUpdate(
        { userId },
        {
          $set: {
            faceScan: {
              daily_count: 1,
              target: 1,
              total_count: 1,
              currentDailyStreak: 1,
              currentWeeklyStreak: 0,
              currentMonthlyStreak: 0,
              dailyCompleted: true,
              lastUpdated: Date.now(),
              createdAt: Date.now()
            }
          }
        },
        { new: true }
      );
      return streak;
    }

    console.log(`FaceScan streak found for userId: ${userId}.`);
    const lastUpdated = moment(streak.faceScan.lastUpdated).startOf('day');
    console.log(`Last updated: ${lastUpdated.format()}, Today: ${today.format()}`);

    if (today.diff(lastUpdated, 'days') > 1) {
      console.log(`A day was missed. Resetting FaceScan streak.`);
      streak = await streakModel.findOneAndUpdate(
        { userId },
        {
          $set: {
            'faceScan.daily_count': 1,
            'faceScan.currentDailyStreak': 1,
            'faceScan.currentWeeklyStreak': 0,
            'faceScan.currentMonthlyStreak': 0,
            'faceScan.lastUpdated': Date.now()
          },
          $inc: { 'faceScan.total_count': 1 }
        },
        { new: true }
      );
      return streak;
    }

    if (today.isSame(lastUpdated, 'day')) {
      streak.faceScan.daily_count += 1;
      streak.faceScan.lastUpdated = Date.now();
      console.log(`FaceScan daily_count updated to ${streak.faceScan.daily_count}`);
    } else if (today.diff(lastUpdated, 'days') === 1) {
      streak.faceScan.daily_count = 1;
      streak.faceScan.dailyCompleted = true;
      streak.faceScan.lastUpdated = Date.now();
      streak.faceScan.currentDailyStreak += 1;
      console.log(`FaceScan new day: currentDailyStreak is ${streak.faceScan.currentDailyStreak}`);
    }

    streak.faceScan.total_count += 1;
    if (streak.faceScan.currentDailyStreak % 7 === 0) {
        const faceScanReward = await TaskService.getTaskByFeatureType("Face Scanning");
        await UserRewardService.updateDailyTaskCompletion(userId, faceScanReward._id, faceScanReward.points);

        streak.faceScan.currentWeeklyStreak += 1;
        console.log(`FaceScan weekly streak achieved. currentWeeklyStreak: ${streak.faceScan.currentWeeklyStreak}`);
        await UserRewardService.addStreakAchievement(userId, 'weekly', streak.faceScan.currentWeeklyStreak, 50);
    }

    const daysInCurrentMonthFS = moment(currentDate).daysInMonth();
    if ((streak.faceScan.currentDailyStreak + 1) >= daysInCurrentMonthFS &&
        await StreakService.isSameMonth(Date.now(), streak.faceScan.createdAt)) {
      streak.faceScan.currentMonthlyStreak += 1;
      console.log(`FaceScan monthly streak achieved. currentMonthlyStreak: ${streak.faceScan.currentMonthlyStreak}`);
      await UserRewardService.addStreakAchievement(userId, 'monthly', streak.faceScan.currentMonthlyStreak, 100);
    }

    await streak.save();
    return streak;
  }

  // ----------------------
  // Blood Glucose Streak Sync
  // ----------------------
  static async syncBloodGlucoseStreakData(userId, currentDate) {
    console.log(`Sync Blood Glucose started for userId: ${userId}, date: ${currentDate}`);
    const today = moment(currentDate).startOf('day');
    let streak = await streakModel.findOne({ userId });

    // If no streak document exists or bloodGlucose subdocument is missing, initialize it.
    if (!streak) {
      console.log(`No streak found for userId: ${userId}. Creating new bloodGlucose streak.`);
      const newStreak = new streakModel({
        userId,
        bloodGlucose: {
          daily_count: 1,
          targetDaily: 3,    // Log blood glucose 3 times a day (manual)
          targetWeekly: 18,  // Log at least 18 times per week
          targetMonthly: 80, // Log at least 80 times per month
          total_count: 1,
          currentDailyStreak: 0,
          currentWeeklyStreak: 0,
          currentMonthlyStreak: 0,
          dailyCompleted: false,
          lastUpdated: Date.now(),
          createdAt: Date.now()
        },
        lastUpdated: Date.now()
      });
      streak = await newStreak.save();
      return streak;
    }

    if (!streak.bloodGlucose) {
      console.log(`Streak exists but bloodGlucose data missing for userId: ${userId}. Initializing bloodGlucose.`);
      streak = await streakModel.findOneAndUpdate(
        { userId },
        {
          $set: {
            bloodGlucose: {
              daily_count: 1,
              targetDaily: 3,
              targetWeekly: 18,
              targetMonthly: 80,
              total_count: 1,
              currentDailyStreak: 0,
              currentWeeklyStreak: 0,
              currentMonthlyStreak: 0,
              dailyCompleted: false,
              lastUpdated: Date.now(),
              createdAt: Date.now()
            }
          }
        },
        { new: true }
      );
    }

    console.log(`BloodGlucose streak found for userId: ${userId}.`);
    const lastUpdatedBG = moment(streak.bloodGlucose.lastUpdated).startOf('day');
    console.log(`Last updated: ${lastUpdatedBG.format()}, Today: ${today.format()}`);

    if (today.isSame(lastUpdatedBG, 'day')) {
      streak.bloodGlucose.daily_count += 1;
      console.log(`Same day: bloodGlucose daily_count increased to ${streak.bloodGlucose.daily_count}`);
    } else if (today.diff(lastUpdatedBG, 'days') === 1) {
      console.log(`Consecutive day: resetting bloodGlucose daily_count to 1`);
      streak.bloodGlucose.daily_count = 1;
      streak.bloodGlucose.dailyCompleted = false;
    } else {
      console.log(`Inactivity detected: resetting bloodGlucose streaks`);
      streak.bloodGlucose.daily_count = 1;
      streak.bloodGlucose.currentDailyStreak = 0;
      streak.bloodGlucose.currentWeeklyStreak = 0;
      streak.bloodGlucose.currentMonthlyStreak = 0;
      streak.bloodGlucose.dailyCompleted = false;
    }

    // Daily requirement: log blood glucose 3 times per day.
    if (!streak.bloodGlucose.dailyCompleted && streak.bloodGlucose.daily_count >= streak.bloodGlucose.targetDaily) {
      streak.bloodGlucose.dailyCompleted = true;
      const bloodGlucoseLogReward = await TaskService.getTaskByFeatureType("Log Blood Glucose");
      await UserRewardService.updateDailyTaskCompletion(userId, bloodGlucoseLogReward._id, bloodGlucoseLogReward.points);
      streak.bloodGlucose.currentDailyStreak += 1;
      console.log(`BloodGlucose daily streak achieved. currentDailyStreak: ${streak.bloodGlucose.currentDailyStreak}`);
      // Award daily blood glucose achievement (10 points)
      await UserRewardService.addStreakAchievement(userId, 'daily', streak.bloodGlucose.currentDailyStreak, 10);

      // Weekly: if total_count for blood glucose logs reaches targetWeekly, award weekly achievement.
      if (streak.bloodGlucose.total_count >= streak.bloodGlucose.targetWeekly) {
        streak.bloodGlucose.currentWeeklyStreak += 1;
        console.log(`BloodGlucose weekly streak achieved. currentWeeklyStreak: ${streak.bloodGlucose.currentWeeklyStreak}`);
        await UserRewardService.addStreakAchievement(userId, 'weekly', streak.bloodGlucose.currentWeeklyStreak, 50);
      }
    }

    streak.bloodGlucose.total_count += 1;
    console.log(`BloodGlucose total_count incremented to ${streak.bloodGlucose.total_count}`);

    // Monthly: if total_count for blood glucose logs reaches targetMonthly within the same month.
    if (streak.bloodGlucose.total_count >= streak.bloodGlucose.targetMonthly && await StreakService.isSameMonth(Date.now(), streak.bloodGlucose.createdAt)) {
      streak.bloodGlucose.currentMonthlyStreak += 1;
      console.log(`BloodGlucose monthly streak achieved. currentMonthlyStreak: ${streak.bloodGlucose.currentMonthlyStreak}`);
      await UserRewardService.addStreakAchievement(userId, 'monthly', streak.bloodGlucose.currentMonthlyStreak, 100);
    }

    streak.bloodGlucose.lastUpdated = Date.now();
    console.log(`BloodGlucose sync completed for userId: ${userId}. Saving changes.`);
    await streak.save();
    return streak;
  }
}

module.exports = StreakService;
