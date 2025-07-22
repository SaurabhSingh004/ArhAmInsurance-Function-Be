const smartscaleController = require('../controllers/SmartscaleMetricsController');
const validate = require('../config/validator.config');
const { authenticateToken } = require('../middleware/auth');

const smartscaleRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/smartscaleMetrics/add',
            middleware: [authenticateToken],
            handler: smartscaleController.addBodyCompositionMetrics,
            description: 'Add body composition metrics'
        },
        {
            method: 'GET',
            path: '/smartscaleMetrics/summary/smartscale-page',
            middleware: [authenticateToken],
            handler: smartscaleController.getSmartscalePage,
            description: 'Get smartscale page summary'
        },
        {
            method: 'GET',
            path: '/smartscaleMetrics/readings',
            middleware: [authenticateToken],
            handler: smartscaleController.getSmartscaleReadings,
            description: 'Get smartscale readings'
        },
        {
            method: 'POST',
            path: '/smartscaleMetrics/add-by-uuid',
            middleware: [authenticateToken],
            handler: smartscaleController.addBodyCompositionMetricsByUuid,
            description: 'Add body composition metrics by UUID'
        },
        {
            method: 'GET',
            path: '/smartscaleMetrics/get',
            middleware: [authenticateToken, validate('get_body_metrics')],
            handler: smartscaleController.getBodyCompositionMetrics,
            description: 'Get body composition metrics'
        },
        {
            method: 'GET',
            path: '/smartscaleMetrics/getlatest',
            middleware: [authenticateToken, validate('get_body_metrics')],
            handler: smartscaleController.getLastReadingParentChild,
            description: 'Get latest reading parent child'
        },
        {
            method: 'POST',
            path: '/smartscaleMetrics/delete',
            middleware: [authenticateToken, validate('delete_body_metrics')],
            handler: smartscaleController.deleteBodyCompositionMetrics,
            description: 'Delete body composition metrics'
        },
        {
            method: 'GET',
            path: '/smartscaleMetrics/getbyid/:_id',
            middleware: [authenticateToken, validate('get_metrics_by_id')],
            handler: smartscaleController.getReadingById,
            description: 'Get reading by ID'
        },
        {
            method: 'GET',
            path: '/smartscaleMetrics/getCount',
            middleware: [authenticateToken],
            handler: smartscaleController.getSmartscaleUserCount,
            description: 'Get smartscale user count'
        },
        {
            method: 'GET',
            path: '/smartscaleMetrics/DataNumbers',
            middleware: [authenticateToken],
            handler: smartscaleController.getSmartscaleUserDataCount,
            description: 'Get smartscale user data count'
        },
        {
            method: 'POST',
            path: '/smartscaleMetrics/add-manual-weight',
            middleware: [authenticateToken],
            handler: smartscaleController.addManualWeightEntry,
            description: 'Add manual weight entry'
        }
    ],

    // Method to register all smartscale routes with the router
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

module.exports = smartscaleRoutes;