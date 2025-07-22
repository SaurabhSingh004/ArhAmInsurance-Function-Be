const userRewardController = require('../controllers/UserRewardController');
const { authenticateToken } = require('../middleware/auth');

const userRewardRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/userRewards/seed',
            middleware: [authenticateToken],
            handler: userRewardController.seedDailyUserReward,
            description: 'Seeds the daily user reward for the authenticated user'
        },
        {
            method: 'POST',
            path: '/userRewards/complete-task',
            middleware: [authenticateToken],
            handler: userRewardController.completeDailyTask,
            description: 'Complete a daily task and update rewards'
        },
        {
            method: 'GET',
            path: '/userRewards',
            middleware: [authenticateToken],
            handler: userRewardController.getRewardsInRange,
            description: 'Get rewards within a date range'
        },
        {
            method: 'GET',
            path: '/userRewards/incomplete-tasks',
            middleware: [authenticateToken],
            handler: userRewardController.getIncompleteTasksForToday,
            description: 'Get incomplete tasks for today'
        },
        {
            method: 'GET',
            path: '/userRewards/completed-tasks',
            middleware: [authenticateToken],
            handler: userRewardController.getCompletedTasksByDate,
            description: 'Get completed tasks by date'
        },
        {
            method: 'GET',
            path: '/userRewards/today',
            middleware: [authenticateToken],
            handler: userRewardController.getRewardsDataForToday,
            description: 'Get rewards data for today including incomplete tasks'
        }
    ],

    // Method to register all user reward routes with the router
    registerRoutes: function(router) {
        this.routes.forEach(route => {
            const { method, path, middleware, handler } = route;
            if (middleware && middleware.length > 0) {
                router.addRoute(method, path, [...middleware, handler]);
            } else {
                router.addRoute(method, path, handler);
            }
        });
    }
};

module.exports = userRewardRoutes;