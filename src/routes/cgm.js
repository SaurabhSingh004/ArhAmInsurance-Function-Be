const cgmController = require('../controllers/CgmController');
const { authenticateToken } = require('../middleware/auth');

const cgmRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'GET',
            path: '/cgm/details',
            middleware: [authenticateToken],
            handler: cgmController.fnCgmDetails,
            description: 'Fetch detailed CGM data for authenticated user'
        },
        {
            method: 'POST',
            path: '/cgm/log',
            middleware: [authenticateToken],
            handler: cgmController.fnCGMData,
            description: 'Manually log CGM glucose reading'
        },
        {
            method: 'GET',
            path: '/cgm/metabolic-score',
            middleware: [authenticateToken],
            handler: cgmController.fnGetMetabolicScore,
            description: 'Get latest metabolic score for authenticated user'
        },
        {
            method: 'POST',
            path: '/cgm/sensor-data/upload',
            middleware: [authenticateToken],
            handler: cgmController.fnUploadSensorData,
            description: 'Upload sensor data for continuous glucose monitoring'
        },
        {
            method: 'GET',
            path: '/cgm/readings/range',
            middleware: [authenticateToken],
            handler: cgmController.getDateRangeGlucoseReadings,
            description: 'Get glucose readings by date range with statistics'
        }
    ],

    // Method to register all CGM routes with the router
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

module.exports = cgmRoutes;
