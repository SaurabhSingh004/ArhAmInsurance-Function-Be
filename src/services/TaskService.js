const { logError } = require('../utils/logError');
const TaskModel = require('../models/Task');
const DailyUserRewardModel = require('../models/UserReward');
const tasks = require('../utils/data/adminTasks');
const UserRewardService = require('./UseRewardsService');

class TaskService {
  // ----------------------------
  // TASK SEEDING & CRUD METHODS
  // ----------------------------
  
  static async seedTasks(taskData) {
    try {
      const insertedTasks = await TaskModel.insertMany(tasks);
      console.log(`${insertedTasks.length} tasks inserted successfully`);
      return insertedTasks;
    } catch (error) {
      logError('TaskService.seedTasks', error, { taskData });
      throw new Error('Failed to seed task');
    }
  }

  static async createTask(taskData) {
    try {
      const task = new TaskModel(taskData);
      return await task.save();
    } catch (error) {
      logError('TaskService.createTask', error, { taskData });
      throw new Error('Failed to create task');
    }
  }

  static async getAllTasks(query = {}) {
    try {
      return await TaskModel.find({ ...query, isActive: true });
    } catch (error) {
      logError('TaskService.getAllTasks', error, { query });
      throw new Error('Failed to fetch tasks');
    }
  }

  static async getTaskByFeatureType(featureType) {
    try {
        if (!featureType) {
            throw new Error('Feature type is required');
        }

        const task = await TaskModel.findOne({ 
            featureType: featureType, 
            isActive: true 
        }).exec();

        return task; // Returns single task or null if not found

    } catch (error) {
        logError('TaskService.getTaskByFeatureType', error, { 
            featureType,
            errorMessage: error.message,
            stack: error.stack 
        });

        if (error.name === 'ValidationError') {
            throw new Error('Invalid feature type format');
        } else if (error.name === 'CastError') {
            throw new Error('Invalid feature type value');
        } else {
            throw new Error(`Failed to fetch task: ${error.message}`);
        }
    }
}

  static async updateTask(taskId, updateData) {
    try {
      if (!taskId) {
        throw new Error('Task ID is required');
      }

      const task = await TaskModel.findByIdAndUpdate(
        taskId,
        { ...updateData, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );

      if (!task) {
        throw new Error('Task not found');
      }

      return task;
    } catch (error) {
      logError('TaskService.updateTask', error, { taskId, updateData });
      throw new Error('Failed to update task');
    }
  }

  static async deleteTask(taskId) {
    try {
      if (!taskId) {
        throw new Error('Task ID is required');
      }

      const task = await TaskModel.findByIdAndUpdate(
        taskId,
        { isActive: false, updatedAt: Date.now() },
        { new: true }
      );

      if (!task) {
        throw new Error('Task not found');
      }

      return task;
    } catch (error) {
      logError('TaskService.deleteTask', error, { taskId });
      throw new Error('Failed to delete task');
    }
  }

  static async getTasksByFeatureType(featureType) {
    try {
      // Find tasks where featureType matches and task is active.
      return await TaskModel.find({ featureType, isActive: true });
    } catch (error) {
      throw new Error('Failed to fetch tasks by feature type');
    }
  }

  // ----------------------------
  // USER REWARD / TASK COMPLETION
  // ----------------------------

  /**
   * Marks a task as completed for a user by updating the DailyUserReward record.
   * This method now uses the "availableTasks" array as defined in the new model.
   *
   * @param {String} userId - The ID of the user.
   * @param {String} taskId - The ID of the task.
   * @returns {Promise<Object>} - The updated DailyUserReward document.
   */
  static async completeUserTask(userId, taskId) {
    try {
      if (!userId || !taskId) {
        throw new Error('User ID and Task ID are required');
      }

      // Get task details
      const task = await TaskModel.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      if (!task.isActive) {
        throw new Error('Task is inactive');
      }

      // Set today's date (start of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find a reward record for today or create a new one if not found.
      let dailyReward = await DailyUserRewardModel.findOne({
        userId,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      });

      if (!dailyReward) {
        dailyReward = new DailyUserRewardModel({
          userId,
          date: today,
          dailyPoints: 0,
          availableTasks: [],
          totalPointsEarned: 0
        });
      }

      // Check if the task is already completed today by examining availableTasks.
      const taskAlreadyCompleted = dailyReward.availableTasks.some(
        availableTask =>
          availableTask.taskId.toString() === taskId &&
          availableTask.isCompleted === true
      );

      if (taskAlreadyCompleted) {
        throw new Error('Task already completed today');
      }

      // Add the task to availableTasks and mark it as completed.
      dailyReward.availableTasks.push({
        taskId: task._id,
        pointsEarned: task.points,
        isCompleted: true,
        completedAt: new Date()
      });

      // Update daily points and total points earned.
      dailyReward.dailyPoints += task.points;
      dailyReward.totalPointsEarned += task.points;

      await dailyReward.save();

      return dailyReward;
    } catch (error) {
      logError('TaskService.completeUserTask', error, { userId, taskId });
      throw new Error(error.message || 'Failed to complete task');
    }
  }

  /**
   * Retrieves the daily reward record for a user on a specific date.
   * This method now populates the "availableTasks" field.
   *
   * @param {String} userId - The ID of the user.
   * @param {Date} date - The date for which to fetch the reward.
   * @returns {Promise<Object>} - The DailyUserReward document or a default object.
   */
  static async getUserDailyRewards(userId, date = new Date()) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      let rewards = await DailyUserRewardModel.findOne({
        userId,
        date: {
          $gte: startOfDay,
          $lt: endOfDay
        }
      }).populate('availableTasks.taskId');

      if (!rewards) {
        rewards = await UserRewardService.seedDailyUserReward(userId);
      }

      return rewards;
    } catch (error) {
      logError('TaskService.getUserDailyRewards', error, { userId, date });
      throw new Error('Failed to fetch user daily rewards');
    }
  }

  // ----------------------------
  // TASK FEATURE TYPES
  // ----------------------------
  static async getUniqueFeatureTypes() {
    try {
      const result = await TaskModel.aggregate([
        // Filter only active tasks.
        { $match: { isActive: true } },
        // Group by featureType.
        {
          $group: {
            _id: "$featureType"
          }
        },
        // Project the output to have a "featureType" field.
        {
          $project: {
            _id: 0,
            featureType: "$_id"
          }
        }
      ]);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = TaskService;
