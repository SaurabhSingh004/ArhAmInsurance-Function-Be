const homePageController = require('../controllers/HomePageController');
const { authenticateToken } = require('../middleware/auth');

const homePageRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'GET',
            path: '/home/dashboard',
            middleware: [authenticateToken],
            handler: homePageController.getAdminDashboardData,
            description: 'Get admin dashboard data'
        },
        {
            method: 'GET',
            path: '/home',
            middleware: [authenticateToken],
            handler: homePageController.getHomeData,
            description: 'Get home page data for authenticated user'
        }
    ],

    // Method to register all home page routes with the router
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

module.exports = homePageRoutes;