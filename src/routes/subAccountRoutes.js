const subAccountController = require('../controllers/SubAccountController');
const { authenticateToken } = require('../middleware/auth');
const { validateSubAccount, validateSubAccountUpdate, validateProfileUpdate } = require('../middleware/validation');

const subAccountRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/subAccount',
            middleware: [authenticateToken, validateSubAccount],
            handler: subAccountController.createSubAccount,
            description: 'Create a new sub-account'
        },
        {
            method: 'GET',
            path: '/subAccount',
            middleware: [authenticateToken],
            handler: subAccountController.getSubAccounts,
            description: 'Get all sub-accounts for the authenticated user'
        },
        {
            method: 'GET',
            path: '/subAccount/mode/:modeSelection',
            middleware: [authenticateToken],
            handler: subAccountController.getSubAccountsByMode,
            description: 'Get sub-accounts by mode selection'
        },
        {
            method: 'GET',
            path: '/subAccount/:id',
            middleware: [authenticateToken],
            handler: subAccountController.getSubAccountById,
            description: 'Get a specific sub-account by ID'
        },
        {
            method: 'PUT',
            path: '/subAccount/:id',
            middleware: [authenticateToken, validateSubAccountUpdate],
            handler: subAccountController.updateSubAccount,
            description: 'Update a sub-account'
        },
        {
            method: 'PATCH',
            path: '/subAccount/:id/profile',
            middleware: [authenticateToken, validateProfileUpdate],
            handler: subAccountController.updateSubAccountProfile,
            description: 'Update only the profile of a sub-account'
        },
        {
            method: 'DELETE',
            path: '/subAccount/:id',
            middleware: [authenticateToken],
            handler: subAccountController.deleteSubAccount,
            description: 'Delete a sub-account'
        }
    ],

    // Method to register all sub-account routes with the router
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

module.exports = subAccountRoutes;