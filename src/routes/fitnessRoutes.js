const FitnessController = require('../controllers/FitnessDataController');
const { authenticateToken } = require('../middleware/auth');
const fitnessRoutes = {
    routes: [
        {
            method: 'GET',
            path: '/fitness',
            middleware: [authenticateToken],
            handler: FitnessController.getFitnessData,
            description: 'Get fitness data by type and range'
        },
        {
            method: 'GET',
            path: '/fitness/recent-reports',
            middleware: [authenticateToken],
            handler: FitnessController.getRecentReports,
            description: 'Get recent fitness reports'
        },
        {
            method: 'POST',
            path: '/fitness/sync',
            middleware: [authenticateToken],
            handler: FitnessController.syncGoogleFitData,
            description: 'Sync Google Fit or Apple Health data'
        },
        {
            method: 'POST',
            path: '/fitness/water',
            middleware: [authenticateToken],
            handler: FitnessController.addWaterEntry,
            description: 'Add water intake entry'
        }
    ],
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

module.exports = fitnessRoutes;