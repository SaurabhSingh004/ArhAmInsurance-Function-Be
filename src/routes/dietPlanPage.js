const dietPageController = require('../controllers/DietPageController');
const { authenticateToken } = require('../middleware/auth');

const dietPageRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'GET',
            path: '/dietPage/:date',
            middleware: [authenticateToken],
            handler: dietPageController.getTodaysDietPage,
            description: 'Get diet page data for a specific date'
        }
    ],

    // Method to register all diet page routes with the router
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

module.exports = dietPageRoutes;
