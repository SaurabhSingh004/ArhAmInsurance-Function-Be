const checklistController = require('../controllers/ChecklistController');
const { authenticateToken } = require('../middleware/auth');

const checklistRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/checklists/tasks',
            middleware: [authenticateToken],
            handler: checklistController.createTask,
            description: 'Create a new task'
        },
        {
            method: 'GET',
            path: '/checklists/tasks',
            middleware: [authenticateToken],
            handler: checklistController.getTasks,
            description: 'Get today\'s tasks for the authenticated user'
        },
        {
            method: 'PATCH',
            path: '/checklists/tasks/:taskId',
            middleware: [authenticateToken],
            handler: checklistController.updateTask,
            description: 'Update a specific task by ID'
        },
        {
            method: 'DELETE',
            path: '/checklists/tasks/:taskId',
            middleware: [authenticateToken],
            handler: checklistController.deleteTask,
            description: 'Delete a specific task by ID'
        },
        {
            method: 'GET',
            path: '/checklists/tasks/:date',
            middleware: [authenticateToken],
            handler: checklistController.getTasksByDate,
            description: 'Get tasks for a specific date'
        },
        {
            method: 'GET',
            path: '/summary',
            middleware: [authenticateToken],
            handler: checklistController.getDailySummary,
            description: 'Get daily summary for the authenticated user'
        }
    ],

    // Method to register all checklist routes with the router
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

module.exports = checklistRoutes;