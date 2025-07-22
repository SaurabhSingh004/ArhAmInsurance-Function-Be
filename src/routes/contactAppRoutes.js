const ocaviorContactController = require('../controllers/OcaviorContactController');
const { authenticateToken } = require('../middleware/auth');

const contactRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/contact',
            middleware: [], // Public route - no authentication required
            handler: ocaviorContactController.submitContactForm,
            description: 'Submit Ocavior contact form (public access)'
        },
        {
            method: 'GET',
            path: '/contact/allContacts',
            middleware: [authenticateToken], // Protected route for admin access
            handler: ocaviorContactController.getAllContacts,
            description: 'Get all Ocavior contact form submissions (admin access)'
        },
        {
            method: 'POST',
            path: '/contact/increvolve',
            middleware: [], // Public route - no authentication required
            handler: ocaviorContactController.submitIncrevolveContact,
            description: 'Submit Increvolve contact form (public access)'
        },
        {
            method: 'GET',
            path: '/contact/allIncrevolveContacts',
            middleware: [authenticateToken], // Protected route for admin access
            handler: ocaviorContactController.getAllIncrevolveContacts,
            description: 'Get all Increvolve contact form submissions (admin access)'
        }
    ],

    // Method to register all contact routes with the router
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

module.exports = contactRoutes;