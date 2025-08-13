const emergencyContactsController = require('../controllers/emergencyContactsController');
const { authenticateToken } = require('../middleware/auth');
const emergencyContactRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/emergencyContacts',
            middleware: [authenticateToken],
            handler: emergencyContactsController.addContact,
            description: 'Add new emergency contact'
        },
        {
            method: 'PUT',
            path: '/emergencyContacts/:id',
            middleware: [authenticateToken],
            handler: emergencyContactsController.updateContact,
            description: 'Update emergency contact by ID'
        },
        {
            method: 'PUT',
            path: '/emergencyContacts/active',
            middleware: [authenticateToken],
            handler: emergencyContactsController.makeContactActive,
            description: 'Update emergency contact by ID'
        },
        {
            method: 'DELETE',
            path: '/emergencyContacts/:id',
            middleware: [authenticateToken],
            handler: emergencyContactsController.deleteContact,
            description: 'Delete emergency contact by ID'
        },
        {
            method: 'GET',
            path: '/emergencyContacts',
            middleware: [authenticateToken],
            handler: emergencyContactsController.getContacts,
            description: 'Get all emergency contacts for user'
        },
        {
            method: 'GET',
            path: '/emergencyContacts/active-contact',
            middleware: [authenticateToken],
            handler: emergencyContactsController.getActiveContact,
            description: 'Get emergency contact by ID'
        }
    ],

    // Method to register all emergency contact routes with the router
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

module.exports = emergencyContactRoutes;