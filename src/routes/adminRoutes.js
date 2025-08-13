const AdminController = require('../controllers/adminController');

const adminRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {//login
            method: 'GET',
            path: '/admin/user/:id',
            middleware: [],
            handler: AdminController.getUserById,
            description: 'Get user data by user ID'
        }, 
        {//login
            method: 'POST',
            path: '/admin/login',
            middleware: [],
            handler: AdminController.loginUser,
            description: 'admin login'
        },
        // {//get all users
        //     method: 'GET',
        //     path: '/admin/getAll',
        //     middleware: [],
        //     handler: AdminController.getAllUsers,
        //     description: 'Get all users with pagination'
        // },
        {//delete usr by id 
            method: 'DELETE',
            path: '/admin/deleteUser',
            middleware: [],
            handler: AdminController.deleteUserByAdmin,
            description: 'Delete users by admin'
        },
        {//search user
            method: 'GET',
            path: '/admin/getAll',
            middleware: [],
            handler: AdminController.searchUsers,
            description: 'Search users with filters'
        },
        {
            method: 'PATCH',
            path: '/admin/updateUser',
            middleware: [],
            handler: AdminController.updateOrToggleProfile,
            description: 'Toggle user boolean field'
        },
    ],

    // Method to register all user routes with the router
    registerRoutes: function (router) {
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

module.exports = adminRoutes;
