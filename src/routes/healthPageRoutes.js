const healthPageController = require('../controllers/HealthPageController');
const { authenticateToken } = require('../middleware/auth');

const healthPageRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'GET',
            path: '/health',
            middleware: [authenticateToken],
            handler: healthPageController.getHealthData,
            description: 'Get comprehensive health data for authenticated user'
        },
        {
            method: 'GET',
            path: '/health/water',
            middleware: [authenticateToken],
            handler: healthPageController.getWaterData,
            description: 'Get today\'s water intake data for authenticated user'
        },
        {
            method: 'GET',
            path: '/health/healthInsight',
            middleware: [authenticateToken],
            handler: healthPageController.getHealthInsightData,
            description: 'Get health insights data including vitals, blood tests, and glucose readings'
        }
    ],

    // Method to register all health page routes with the router
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

module.exports = healthPageRoutes;