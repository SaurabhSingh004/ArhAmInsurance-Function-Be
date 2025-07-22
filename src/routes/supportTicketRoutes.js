const supportTicketController = require('../controllers/supportTicketController');
const { authenticateToken } = require('../middleware/auth');

const supportTicketRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/supportTicket',
            middleware: [authenticateToken],
            handler: supportTicketController.createTicket,
            description: 'Create a new support ticket'
        }
    ],

    // Method to register all support ticket routes with the router
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

module.exports = supportTicketRoutes;