const coachHistoryController = require('../controllers/CoachHistoryController');
const { authenticateToken } = require('../middleware/auth');

const coachHistoryRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'GET',
            path: '/coach-history',
            middleware: [authenticateToken],
            handler: coachHistoryController.getUserInteractions,
            description: 'Get all coach interactions for authenticated user'
        },
        {
            method: 'GET',
            path: '/coach-history/:interactionId',
            middleware: [authenticateToken],
            handler: coachHistoryController.getInteractionById,
            description: 'Get specific coach interaction by ID'
        }
    ],

    // Method to register all coach history routes with the router
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

module.exports = coachHistoryRoutes;
