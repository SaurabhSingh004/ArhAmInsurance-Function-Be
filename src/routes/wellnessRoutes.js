const wellnessController = require('../controllers/WellnessController');
const { authenticateToken } = require('../middleware/auth');

const wellnessRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/wellness/save',
            middleware: [authenticateToken],
            handler: wellnessController.saveWellnessScore,
            description: 'Save wellness score for a user'
        },
        {
            method: 'GET',
            path: '/wellness/score',
            middleware: [authenticateToken],
            handler: wellnessController.getWellnessScore,
            description: 'Get basic wellness score for a user'
        },
        {
            method: 'GET',
            path: '/wellness/detailed',
            middleware: [authenticateToken],
            handler: wellnessController.getDetailedWellnessScore,
            description: 'Get detailed wellness scores for a user'
        }
    ],

    // Method to register all wellness routes with the router
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

module.exports = wellnessRoutes;