const coachController = require('../controllers/CoachController');
const { authenticateToken } = require('../middleware/auth');

const coachRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/coach',
            middleware: [authenticateToken],
            handler: coachController.getCoachResponse,
            description: 'Get AI coach response for user query'
        }
    ],

    // Method to register all coach routes with the router
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

module.exports = coachRoutes;
