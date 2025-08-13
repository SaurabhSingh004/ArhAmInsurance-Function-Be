const faceScanVitalController = require('../controllers/FaceVitalScanController');
const { authenticateToken } = require('../middleware/auth');

const faceScanVitalRoutes = {
    routes: [
        {
            method: 'POST',
            path: '/faceScan',
            handler: faceScanVitalController.addFaceScanVitalData,
            description: 'Create new face scan vital data'
        },
        {
            method: 'GET',
            path: '/faceScan',
            middleware: [authenticateToken],
            handler: faceScanVitalController.getAllFaceScanVitalData,
            description: 'Get all face scan vital data for authenticated user'
        },
        {
            method: 'GET',
            path: '/face-scans',
            handler: faceScanVitalController.getFaceScans,
            description: 'Get all face scans for specific arcare user'
        },
        {
            method: 'GET',
            path: '/face-scan-vitals',
            handler: faceScanVitalController.getFaceScanVitals,
            description: 'Get detailed face scan vital logs for specific arcare user'
        },
        {
            method: 'GET',
            path: '/faceScan/latest',
            middleware: [authenticateToken],
            handler: faceScanVitalController.getLatestFaceScanVitalData,
            description: 'Get latest face scan vital data'
        },
        {
            method: 'GET',
            path: '/faceScan/byDate',
            middleware: [authenticateToken],
            handler: faceScanVitalController.getFaceScanVitalsByDate,
            description: 'Get face scan vitals by specific date'
        },
        {
            method: 'GET',
            path: '/faceScan/:id',
            middleware: [authenticateToken],
            handler: faceScanVitalController.getFaceScanVitalData,
            description: 'Get specific face scan vital data by ID'
        },
        {
            method: 'POST',
            path: '/faceScan/reduce-scan',
            middleware: [authenticateToken],
            handler: faceScanVitalController.reduceVScanCount,
            description: 'Reduce VScan count and add face scan vital data'
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

module.exports = faceScanVitalRoutes;