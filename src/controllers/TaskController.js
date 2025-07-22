const taskService = require('../services/TaskService');
const {logError} = require('../utils/logError');

class TaskController {

    seedTask = async (request, context) => {
        try {
            const task = await taskService.seedTasks();
            return {
                status: 201,
                jsonBody: {
                    success: true,
                    data: task
                }
            };
        } catch (error) {
            const err = logError('seedTask', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: err.message
                }
            };
        }
    }

    createTask = async (request, context) => {
        try {
            const task = await taskService.createTask(await request.json() || {});
            return {
                status: 201,
                jsonBody: {
                    success: true,
                    data: task
                }
            };
        } catch (error) {
            const err = logError('createTask', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: err.message
                }
            };
        }
    }

    getAllTasks = async (request, context) => {
        try {
            const tasks = await taskService.getAllTasks(request.query || {});
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: tasks
                }
            };
        } catch (error) {
            const err = logError('getAllTasks', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: err.message
                }
            };
        }
    }

    getTasksByFeatureType = async (request, context) => {
        try {
            const { featureType } = request.params || {};
            const tasks = await taskService.getTasksByFeatureType(featureType);
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: tasks
                }
            };
        } catch (error) {
            const err = logError('getTasksByFeatureType', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: err.message
                }
            };
        }
    }

    updateTask = async (request, context) => {
        try {
            const { taskId } = request.params || {};
            const task = await taskService.updateTask(taskId, await request.json() || {});
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: task
                }
            };
        } catch (error) {
            const err = logError('updateTask', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: err.message
                }
            };
        }
    }

    deleteTask = async (request, context) => {
        try {
            const { taskId } = request.params || {};
            await taskService.deleteTask(taskId);
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Task deleted successfully'
                }
            };
        } catch (error) {
            const err = logError('deleteTask', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: err.message
                }
            };
        }
    }

    completeUserTask = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { taskId } = request.params || {};
            const result = await taskService.completeUserTask(userId, taskId);
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result
                }
            };
        } catch (error) {
            const err = logError('completeUserTask', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: err.message
                }
            };
        }
    }

    getUserDailyRewards = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { date } = request.query || {};
            const rewards = await taskService.getUserDailyRewards(
                userId,
                date ? new Date(date) : new Date()
            );
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: rewards
                }
            };
        } catch (error) {
            context.log(error);
            const err = logError('getUserDailyRewards', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: err.message
                }
            };
        }
    }

    getUniqueFeatureTypes = async (request, context) => {
        try {
            const featureTypes = await taskService.getUniqueFeatureTypes();
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: featureTypes
                }
            };
        } catch (error) {
            context.error('Error fetching unique feature types:', error);
            const err = logError('getUniqueFeatureTypes', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error fetching unique feature types'
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new TaskController();