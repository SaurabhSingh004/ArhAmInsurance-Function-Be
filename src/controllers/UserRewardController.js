const UserRewardService = require('../services/UseRewardsService');
const {logError} = require('../utils/logError');

class UserRewardController {
  /**
   * POST /api/userrewards/seed
   * Seeds the daily user reward for the authenticated user.
   */
  seedDailyUserReward = async (request, context) => {
    try {
      const userId = context.user?._id;
      
      if (!userId) {
        context.log("No user ID found in request");
        return {
          status: 401,
          jsonBody: { message: "User not authenticated" }
        };
      }
      
      const reward = await UserRewardService.seedDailyUserReward(userId);
      return {
        status: 201,
        jsonBody: {
          success: true,
          data: reward
        }
      };
    } catch (error) {
      context.log("Controller error:", error);
      const err = logError('seedDailyUserReward', error, { userId: context.user?._id });
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: err.message || "Error seeding daily user reward"
        }
      };
    }
  }

  completeDailyTask = async (request, context) => {
    try {
      const userId = context.user?._id;
      const { taskId, date } = await request.json() || {};
      const taskDate = date ? new Date(date) : new Date();
      
      if (!userId) {
        return {
          status: 401,
          jsonBody: { message: "User not authenticated" }
        };
      }
      
      if (!taskId) {
        return {
          status: 400,
          jsonBody: { success: false, message: 'Task ID is required' }
        };
      }
      
      const { reward, dayCompleted } = await UserRewardService.updateDailyTaskCompletion(userId, taskId, taskDate);
      
      return {
        status: 200,
        jsonBody: {
          success: true,
          data: { reward, dayCompleted }
        }
      };
    } catch (error) {
      const err = logError('completeDailyTask', error, { userId: context.user?._id });
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: err.message || 'Failed to update daily task completion'
        }
      };
    }
  }

  getRewardsInRange = async (request, context) => {
    try {
      const { startDate, endDate } = request.query || {};
      const userId = context.user?._id;
      
      if (!userId) {
        return {
          status: 401,
          jsonBody: { message: "User not authenticated" }
        };
      }
      
      // Validate required query parameters
      if (!startDate || !endDate) {
        return {
          status: 400,
          jsonBody: { message: 'startDate and endDate are required.' }
        };
      }

      // Convert dates from strings to Date objects
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Validate that the dates are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return {
          status: 400,
          jsonBody: { message: 'Invalid date format.' }
        };
      }

      const {totalPoints, rewards} = await UserRewardService.getRewardsInRange(userId, start, end);
      return {
        status: 200,
        jsonBody: {
          success: true,
          data: {
            totalPoints,
            rewards
          }
        }
      };
    } catch (error) {
      const err = logError('getRewardsInRange', error, { userId: context.user?._id });
      return {
        status: 500,
        jsonBody: { message: err.message || 'Server error' }
      };
    }
  }

  getIncompleteTasksForToday = async (request, context) => {
    try {
      const userId = context.user?._id;
      
      if (!userId) {
        return {
          status: 401,
          jsonBody: { message: "User not authenticated" }
        };
      }

      const incompleteTasks = await UserRewardService.getIncompleteTasksForToday(userId);
      return {
        status: 200,
        jsonBody: { incompleteTasks }
      };
    } catch (error) {
      const err = logError('getIncompleteTasksForToday', error, { userId: context.user?._id });
      return {
        status: 500,
        jsonBody: { message: err.message || 'Server error' }
      };
    }
  }

  getCompletedTasksByDate = async (request, context) => {
    try {
      const userId = context.user?._id;
      const { date } = request.query || {};
      
      if (!userId) {
        return {
          status: 401,
          jsonBody: { message: "User not authenticated" }
        };
      }

      const completedTasks = await UserRewardService.getCompletedTasksForToday(userId, date);
      return {
        status: 200,
        jsonBody: { completedTasks }
      };
    } catch (error) {
      const err = logError('getCompletedTasksByDate', error, { userId: context.user?._id });
      return {
        status: 500,
        jsonBody: { message: err.message || 'Server error' }
      };
    }
  }

  getRewardsDataForToday = async (request, context) => {
    try {
      const { startDate, endDate } = request.query || {};
      const userId = context.user?._id;
      
      if (!userId) {
        return {
          status: 401,
          jsonBody: { message: "User not authenticated" }
        };
      }
      
      // Validate required query parameters
      if (!startDate || !endDate) {
        return {
          status: 400,
          jsonBody: { message: 'startDate and endDate are required.' }
        };
      }

      // Convert dates from strings to Date objects
      const start = new Date(startDate);
      const end = new Date(endDate);

      const [{totalPoints, rewards}, incompleteTasks] = await Promise.all([
        UserRewardService.getRewardsInRange(userId, start, end),
        UserRewardService.getIncompleteTasksForToday(userId)
      ]);
      
      return {
        status: 200,
        jsonBody: { totalPoints, rewards, incompleteTasks }
      };
    } catch (error) {
      const err = logError('getRewardsDataForToday', error, { userId: context.user?._id });
      return {
        status: 500,
        jsonBody: { message: err.message || 'Server error' }
      };
    }
  }
}

// Export the controller instance
module.exports = new UserRewardController();