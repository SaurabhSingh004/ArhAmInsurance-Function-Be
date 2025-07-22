const bodyCompositionController = require('../controllers/BodyCompositionController');
const { authenticateToken } = require('../middleware/auth');

const bodyCompositionRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/bodyComposition',
            middleware: [authenticateToken],
            handler: bodyCompositionController.createEntry,
            description: 'Create a new body composition entry'
        },
        {
            method: 'GET',
            path: '/bodyComposition/latest',
            middleware: [authenticateToken],
            handler: bodyCompositionController.getLatestEntries,
            description: 'Get latest body composition entry(ies) - returns 1 or 2 latest entries'
        },
        {
            method: 'GET',
            path: '/bodyComposition/graph',
            middleware: [authenticateToken],
            handler: bodyCompositionController.getEntriesForGraph,
            description: 'Get entries formatted for graphing with timeline filtering'
        },
        {
            method: 'GET',
            path: '/bodyComposition/fields',
            middleware: [authenticateToken],
            handler: bodyCompositionController.getAvailableFields,
            description: 'Get available fields for graphing'
        },
        {
            method: 'GET',
            path: '/bodyComposition/stats',
            middleware: [authenticateToken],
            handler: bodyCompositionController.getBodyCompositionStats,
            description: 'Get body composition statistics and trends'
        },
        {
            method: 'GET',
            path: '/bodyComposition/trends',
            middleware: [authenticateToken],
            handler: bodyCompositionController.getTrends,
            description: 'Get body composition trends and analysis'
        },
        {
            method: 'GET',
            path: '/bodyComposition/current',
            middleware: [authenticateToken],
            handler: bodyCompositionController.getCurrentDayData,
            description: 'Get current day body composition data'
        },
        {
            method: 'GET',
            path: '/bodyComposition',
            middleware: [authenticateToken],
            handler: bodyCompositionController.getAllEntries,
            description: 'Get all body composition entries with pagination'
        },
        {
            method: 'PUT',
            path: '/bodyComposition/:id',
            middleware: [authenticateToken],
            handler: bodyCompositionController.updateEntry,
            description: 'Update a body composition entry'
        },
        {
            method: 'DELETE',
            path: '/bodyComposition/:id',
            middleware: [authenticateToken],
            handler: bodyCompositionController.deleteEntry,
            description: 'Delete a body composition entry'
        }
    ],

    // Method to register all body composition routes with the router
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

module.exports = bodyCompositionRoutes;
