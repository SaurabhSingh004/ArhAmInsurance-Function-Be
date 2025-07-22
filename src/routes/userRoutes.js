const userController = require('../controllers/UserController');
const { authenticateToken } = require('../middleware/auth');

const userRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'GET',
            path: '/user',
            middleware: [authenticateToken],
            handler: userController.getUserRespondedInfo,
            description: 'Get authenticated user responded info'
        },
        {
            method: 'GET',
            path: '/user/getProfile/:userId',
            middleware: [authenticateToken],
            handler: userController.getUserData,
            description: 'Get user data by user ID'
        },
        {
            method: 'PATCH',
            path: '/user/profile',
            middleware: [authenticateToken],
            handler: userController.updateProfile,
            description: 'Update user profile'
        },
        {
            method: 'PATCH',
            path: '/user/toggle',
            middleware: [authenticateToken],
            handler: userController.toggleUserBooleanField,
            description: 'Toggle user boolean field'
        },
        {
            method: 'GET',
            path: '/user/profile',
            middleware: [authenticateToken],
            handler: userController.getProfile,
            description: 'Get user profile'
        },
        {
            method: 'GET',
            path: '/user/getAll',
            middleware: [authenticateToken],
            handler: userController.getAllUsers,
            description: 'Get all users with pagination'
        },
        {
            method: 'GET',
            path: '/user/subscribed',
            middleware: [authenticateToken],
            handler: userController.getSubscribedUsersWithPagination,
            description: 'Get subscribed users with pagination'
        },
        {
            method: 'GET',
            path: '/user/search',
            middleware: [authenticateToken],
            handler: userController.searchUsers,
            description: 'Search users with filters'
        },
        {
            method: 'GET',
            path: '/user/subscriptionSearch',
            middleware: [authenticateToken],
            handler: userController.searchSubscribedUser,
            description: 'Search subscribed users'
        }
    ],

    // Method to register all user routes with the router
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

module.exports = userRoutes;