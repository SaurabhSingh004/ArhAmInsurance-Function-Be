// services/UserRewardService.js
const DailyUserReward = require('../models/UserReward');
const Task = require('../models/Task');
const mongoose = require('mongoose');
class UserRewardService {
  /**
   * Seeds a daily user reward for a given user.
   * If a reward record for today already exists, it returns that record.
   *
   * @param {String} userId - The ID of the user.
   * @returns {Promise<Object>} - The DailyUserReward document.
   */
  static async seedDailyUserReward(userId) {
    try {
      // Set today's date to the start of day (00:00:00)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if a DailyUserReward record for this user and today already exists.
      let reward = await DailyUserReward.findOne({
        userId,
        date: { $gte: today }
      });

      if (reward) {
        return reward;
      }

      // Fetch all active daily tasks.
      const tasks = await Task.find({ type: 'daily', isActive: true });

      // Map each task to the availableTasks format.
      // Note: Depending on your use-case, you might initialize pointsEarned to 0.
      const availableTasks = tasks.map(task => ({
        taskId: task._id,
        pointsEarned: 0, // Initially, no points are earned until the task is completed.
        isCompleted: false
      }));

      // Create a new DailyUserReward document.
      reward = new DailyUserReward({
        userId,
        date: new Date(), // this record's date is now (or you can set to 'today')
        dailyPoints: 0,
        availableTasks,
        streakPointsEarned: 0
      });

      await reward.save();

      return reward;
    } catch (error) {
      throw error;
    }
  }

  static async addStreakAchievement(userId, streakType, streakCount, rewardPoints) {
    try {
      // Set today as the start of day.
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let reward = await DailyUserReward.findOne({
        userId,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      });

      if (!reward) {
        reward = new DailyUserReward({
          userId,
          date: today,
          dailyPoints: 0,
          availableTasks: [],
          streakAchievements: [],
          streakPointsEarned: 0
        });
      }

      // Look for an existing achievement for this streak type.
      const existingIndex = reward.streakAchievements.findIndex(
        (ach) => ach.streakType === streakType
      );

      if (existingIndex > -1) {
        // If the new streak count is greater than the existing one, update it.
        if (reward.streakAchievements[existingIndex].streakCount < streakCount) {
          // Adjust total points: remove old points, add new rewardPoints.
          reward.streakPointsEarned =
            reward.streakPointsEarned -
            reward.streakAchievements[existingIndex].rewardPoints +
            rewardPoints;
          reward.streakAchievements[existingIndex].streakCount = streakCount;
          reward.streakAchievements[existingIndex].rewardPoints = rewardPoints;
          reward.streakAchievements[existingIndex].achievedAt = new Date();
        }
      } else {
        // No achievement recorded yet for this type today; add a new one.
        reward.streakAchievements.push({
          streakType,
          achievedAt: new Date(),
          streakCount,
          rewardPoints
        });
        reward.streakPointsEarned += rewardPoints;
      }

      await reward.save();
      return reward;
    } catch (error) {
      throw error;
    }
  }

  static async updateDailyTaskCompletion(userId, taskId, points, date = new Date()) {
    try {
      // Normalize the date to the start of the day.
      const day = new Date(date);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      
      // Find the DailyUserReward document for the user for this day.
      let reward = await DailyUserReward.findOne({
        userId,
        date: { $gte: day, $lt: nextDay }
      });
      if (!reward) {
        throw new Error('Daily reward record not found for the specified day.');
      }
      
      // Find the task in availableTasks by comparing taskId.
      const taskIndex = reward.availableTasks.findIndex(task =>
        task.taskId.toString() === taskId.toString()
      );
      reward.availableTasks[taskIndex].pointsEarned = points;
      
      if (taskIndex === -1) {
        throw new Error('Task not found in the daily reward record.');
      }
      
      // If the task is already completed, simply return.
      if (reward.availableTasks[taskIndex].isCompleted) {
        const dayCompleted = reward.availableTasks.every(task => task.isCompleted);
        return { reward, dayCompleted };
      }
      
      // Mark the task as completed and update its completedAt field.
      reward.availableTasks[taskIndex].isCompleted = true;
      reward.availableTasks[taskIndex].completedAt = new Date();
      
      // Add the points from this task to dailyPoints.
      reward.dailyPoints += points;
      
      // Save the updated document.
      await reward.save();
      
      // Check if all available tasks are completed.
      const dayCompleted = reward.availableTasks.every(task => task.isCompleted);
      
      return { reward, dayCompleted };
    } catch (error) {
      throw error;
    }
  }

  static async getRewardsInRange(userId, startDate, endDate){
    endDate = new Date(endDate.setHours(23, 59, 59, 999));
    // Query rewards for the user between startDate and endDate
    const rewards = await DailyUserReward.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    })
    .select('dailyPoints date')  // _id is included by default
    .sort({ date: 1 });

    const totalPointsResult = await DailyUserReward.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId) // Use 'new' here
        }
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: "$dailyPoints" }
        }
      }
    ]);
    
    const totalPoints = totalPointsResult.length > 0 ? totalPointsResult[0].totalPoints : 0;

    return {totalPoints, rewards};
  };

  static async getIncompleteTasksForToday(userId){
    // Determine the start and end of the current day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    const dailyReward = await DailyUserReward.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate({
      path: 'availableTasks.taskId',
      select: 'title description type points featureType'
    });
  
    // If no record is found, return an empty array
    if (!dailyReward) {
      return [];
    }
  
    // Filter the availableTasks array to only include incomplete tasks
    const incompleteTasks = dailyReward.availableTasks.filter(task => !task.isCompleted);
  
    return incompleteTasks;
  };

    static async getCompletedTasksForToday(userId, date){
    // Determine the start and end of the current day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    console.log("startOfDay", startOfDay);
    console.log("endOfDay", endOfDay);  
    
    const dailyReward = await DailyUserReward.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate({
      path: 'availableTasks.taskId',
      select: 'title description type points featureType'
    });
  
    // If no record is found, return an empty array
    if (!dailyReward) {
      return [];
    }
  
    // Filter the availableTasks array to only include completed tasks
    const completedTasks = dailyReward.availableTasks.filter(task => task.isCompleted);
  
    return completedTasks;
  };
}

module.exports = UserRewardService;
