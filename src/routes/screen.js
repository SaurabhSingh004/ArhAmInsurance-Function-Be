// routes/screenRoutes.js
const ScreenController = require('../controllers/ScreenController');
const { authenticateToken } = require('../middleware/auth');

const screenRoutes = {
    routes: [
        {
            method: 'GET',
            path: '/home-screen',
            middleware: [authenticateToken],
            handler: ScreenController.getHomeScreenData,
            description: 'Get home screen data including goals, vehicle, insurance, and health wellness options'
        },
        {
            method: 'GET',
            path: '/discovery-screen',
            middleware: [authenticateToken],
            handler: ScreenController.getDiscoveryScreenData,
            description: 'Get discovery screen data with feature services and sections'
        },
        {
            method: 'GET',
            path: '/policy-screen',
            middleware: [authenticateToken],
            handler: ScreenController.getPolicyScreenData,
            description: 'Get policy screen data with insurance services and vehicle documents'
        }
    ],

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

module.exports = screenRoutes;