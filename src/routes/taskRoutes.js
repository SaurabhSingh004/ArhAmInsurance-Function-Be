const taskController = require('../controllers/TaskController');
const {authenticateToken} = require('../middleware/auth');

const taskRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/tasks',
            middleware: [authenticateToken],
            handler: taskController.createTask,
            description: 'Create create task'
        },
        {
            method: 'POST',
            path: '/tasks/seed-tasks',
            middleware: [authenticateToken],
            handler: taskController.seedTask,
            description: 'Create seed task'
        },
        {
            method: 'GET',
            path: '/tasks/feature/:featureType',
            middleware: [authenticateToken],
            handler: taskController.getTasksByFeatureType,
            description: 'Get get tasks by feature type'
        },
        {
            method: 'PUT',
            path: '/tasks/:taskId',
            middleware: [authenticateToken],
            handler: taskController.updateTask,
            description: 'Update update task'
        },
        {
            method: 'DELETE',
            path: '/tasks/:taskId',
            middleware: [authenticateToken],
            handler: taskController.deleteTask,
            description: 'Delete delete task'
        },
        {
            method: 'POST',
            path: '/tasks/:taskId/complete',
            middleware: [authenticateToken],
            handler: taskController.completeUserTask,
            description: 'Create complete user task'
        },
        {
            method: 'GET',
            path: '/tasks/dailyRewards',
            middleware: [authenticateToken],
            handler: taskController.getUserDailyRewards,
            description: 'Get get user daily rewards'
        },
        {
            method: 'GET',
            path: '/tasks/feature-types',
            middleware: [authenticateToken],
            handler: taskController.getUniqueFeatureTypes,
            description: 'Get get unique feature types'
        }
    ],

    // Method to register all task routes with the router
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

module.exports = taskRoutes;