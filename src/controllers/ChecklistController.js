const ChecklistService = require('../services/ChecklistService');
const { logError } = require('../utils/logError');

class ChecklistController {

    createTask = async (request, context) => {
        try {
            const userId = context.user?._id;

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const { title } = await request.json() || {};

            if (!title) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Title is required'
                    }
                };
            }

            const result = await ChecklistService.createTask(userId, { title });

            return {
                status: 201,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Task created successfully'
                }
            };
        } catch (error) {
            const err = logError('createTask', error, {
                userId: context.user?._id,
            });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    getTasks = async (request, context) => {
        try {
            const userId = context.user?._id;

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const result = await ChecklistService.getTodayTasks(userId);
            
            if (result.tasks.length == 0) {
                return {
                    status: 200,
                    jsonBody: {
                        success: true,
                        data: result,
                        message: 'No Tasks Found.'
                    }
                };
            } else {
                return {
                    status: 200,
                    jsonBody: {
                        success: true,
                        data: result,
                        message: 'Tasks retrieved successfully'
                    }
                };
            }
        } catch (error) {
            const err = logError('getTasks', error, {
                userId: context.user?._id
            });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    updateTask = async (request, context) => {
        try {
            const userId = context.user?._id;

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const { taskId } = request.params || {};
            const { title, completed } = await request.json() || {};

            if (!taskId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Task ID is required'
                    }
                };
            }

            // Build the update object dynamically
            const updateFields = {};
            if (title !== undefined) updateFields.title = title;
            if (completed !== undefined) updateFields.completed = completed;

            // Check if there are fields to update
            if (Object.keys(updateFields).length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'No valid fields provided for update'
                    }
                };
            }

            // Update the task using ChecklistService
            const result = await ChecklistService.updateTask(userId, taskId, updateFields);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Task updated successfully'
                }
            };
        } catch (error) {
            const err = logError('updateTask', error, {
                userId: context.user?._id,
                taskId: request.params?.taskId
            });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    deleteTask = async (request, context) => {
        try {
            const userId = context.user?._id;

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const { taskId } = request.params || {};

            if (!taskId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Task ID is required'
                    }
                };
            }

            await ChecklistService.deleteTask(userId, taskId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Task deleted successfully'
                }
            };
        } catch (error) {
            const err = logError('deleteTask', error, {
                userId: context.user?._id,
                taskId: request.params?.taskId
            });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    getTasksByDate = async (request, context) => {
        try {
            const userId = context.user?._id;

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const { date } = request.params || {};

            if (!date) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Date parameter is required'
                    }
                };
            }

            const result = await ChecklistService.getTasksByDate(userId, date);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Tasks retrieved successfully'
                }
            };
        } catch (error) {
            const err = logError('getTasksByDate', error, {
                userId: context.user?._id,
                date: request.params?.date
            });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    getDailySummary = async (request, context) => {
        try {
            const userId = context.user?._id;

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const result = await ChecklistService.getDailySummary(userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Summary retrieved successfully'
                }
            };
        } catch (error) {
            const err = logError('getDailySummary', error, {
                userId: context.user?._id
            });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new ChecklistController();