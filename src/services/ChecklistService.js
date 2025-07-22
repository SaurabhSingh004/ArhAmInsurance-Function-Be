const DailyChecklist = require('../models/dailyChecklist');
const { logError } = require('../utils/logError');

class ChecklistService {
    static async createTask(userId, taskData) {
        try {
            let checklist = await this.getTodayChecklist(userId);
            if (!checklist) {
                checklist = new DailyChecklist({
                    userId,
                    tasks: [],
                    totalTasksCount: 0
                });
            }

            checklist.tasks.push(taskData);
            checklist.totalTasksCount = checklist.tasks.length;
            await checklist.save();

            return checklist;
        } catch (error) {
            throw logError('createTask', error, { userId, taskData });
        }
    }

    static async getTodayChecklist(userId) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            return await DailyChecklist.findOne({
                userId,
                createdAt: {
                    $gte: today,
                    $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                },
                updatedAt: {
                    $gte: today,
                    $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                }
            });
        } catch (error) {
            throw logError('getTodayChecklist', error, { userId });
        }
    }

    static async getTodayTasks(userId) {
        try {
            const checklist = await this.getTodayChecklist(userId);
            if (!checklist) {
                return {
                    tasks: [],
                };
            }
    
            // Map tasks to the desired format
            const transformedTasks = checklist.tasks.map(task => ({
                id: task._id.toString(), // Convert ObjectId to string
                title: task.title,
                completed: task.isCompleted,
                strikethrough: task.isCompleted, // Set strikethrough same as completed
            }));
    
            return {
                tasks: transformedTasks,
                completedTasksCount: checklist.completedTasksCount,
                totalTasksCount: checklist.totalTasksCount,
            };
        } catch (error) {
            throw logError('getTodayTasks', error, { userId });
        }
    }

    static async updateTask(userId, taskId, updateFields) {
        try {
            const checklist = await this.getTodayChecklist(userId);
            if (!checklist) {
                throw new Error('No checklist found for today');
            }

            const task = checklist.tasks.id(taskId);
            if (!task) {
                throw new Error('Task not found');
            }

            // Dynamically update fields if they are provided
            if (updateFields.hasOwnProperty('completed')) {
                task.isCompleted = updateFields.completed;
            }
            if (updateFields.hasOwnProperty('title')) {
                task.title = updateFields.title;
            }

            // Update the completed tasks count
            checklist.completedTasksCount = checklist.tasks.filter(t => t.isCompleted).length;

            await checklist.save();

            // Return only the updated task
            return {
                task: task.toObject(), // Convert to plain object
                completedTasksCount: checklist.completedTasksCount,
                totalTasksCount: checklist.tasks.length
            };
        } catch (error) {
            throw logError('updateTask', error, { userId, taskId, updateFields });
        }
    }
    
    static async deleteTask(userId, taskId) {
        try {
            const checklist = await this.getTodayChecklist(userId);
            if (!checklist) {
                throw new Error('No checklist found for today');
            }

            const taskIndex = checklist.tasks.findIndex(t => t._id.toString() === taskId);
            if (taskIndex === -1) {
                throw new Error('Task not found');
            }

            checklist.tasks.splice(taskIndex, 1);
            checklist.totalTasksCount = checklist.tasks.length;
            checklist.completedTasksCount = checklist.tasks.filter(t => t.isCompleted).length;
            
            await checklist.save();
        } catch (error) {
            throw logError('deleteTask', error, { userId, taskId });
        }
    }

    static async getTasksByDate(userId, date) {
        try {
            const queryDate = new Date(date);
            queryDate.setHours(0, 0, 0, 0);
            const checklist = await DailyChecklist.findOne({
                userId,
                createdAt: {
                    $gte: queryDate,
                    $lt: new Date(queryDate.getTime() + 24 * 60 * 60 * 1000)
                },
                updatedAt: {
                    $gte: queryDate,
                    $lt: new Date(queryDate.getTime() + 24 * 60 * 60 * 1000)
                }
            });

            if (!checklist) return null;

            return {
                tasks: checklist.tasks,
                completedTasksCount: checklist.completedTasksCount,
                totalTasksCount: checklist.totalTasksCount,
                date: queryDate
            };
        } catch (error) {
            throw logError('getTasksByDate', error, { userId, date });
        }
    }

    static async getDailySummary(userId) {
        try {
            const checklist = await this.getTodayChecklist(userId);
            if (!checklist) return null;

            return {
                completedTasksCount: checklist.completedTasksCount,
                totalTasksCount: checklist.totalTasksCount,
                completionRate: (checklist.completedTasksCount / checklist.totalTasksCount) * 100
            };
        } catch (error) {
            throw logError('getDailySummary', error, { userId });
        }
    }
}

module.exports = ChecklistService;