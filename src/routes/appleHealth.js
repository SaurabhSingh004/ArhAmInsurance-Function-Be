const appleHealthController = require('../controllers/AppleHealthController');
const { authenticateToken } = require('../middleware/auth');

const appleHealthRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/appleHealth',
            middleware: [authenticateToken],
            handler: appleHealthController.saveHealthData,
            description: 'Save or update Apple Health data'
        },
        {
            method: 'GET',
            path: '/appleHealth',
            middleware: [authenticateToken],
            handler: appleHealthController.getHealthData,
            description: 'Get Apple Health data for authenticated user'
        },
        {
            method: 'PUT',
            path: '/appleHealth',
            middleware: [authenticateToken],
            handler: appleHealthController.updateHealthData,
            description: 'Update Apple Health data'
        },
        {
            method: 'DELETE',
            path: '/appleHealth',
            middleware: [authenticateToken],
            handler: appleHealthController.deleteHealthData,
            description: 'Delete Apple Health data'
        },
        {
            method: 'GET',
            path: '/appleHealth/all',
            middleware: [authenticateToken], // Admin authentication might be needed
            handler: appleHealthController.getAllUsersHealthData,
            description: 'Get all users Apple Health data (admin access)'
        }
    ],

    // Method to register all Apple Health routes with the router
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

module.exports = appleHealthRoutes;
