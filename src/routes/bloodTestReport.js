const bloodTestController = require('../controllers/BloodTestReportController');
const { authenticateToken } = require('../middleware/auth');

const bloodTestRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'GET',
            path: '/testReport/get-all',
            middleware: [authenticateToken],
            handler: bloodTestController.allTestReports,
            description: 'Get all blood test reports for authenticated user'
        },
        {
            method: 'GET',
            path: '/testReport/:reportId',
            middleware: [authenticateToken],
            handler: bloodTestController.testReport,
            description: 'Get specific blood test report by ID'
        },
        {
            method: 'POST',
            path: '/testReport/upload',
            middleware: [authenticateToken],
            handler: bloodTestController.uploadAndProcessBloodTest,
            description: 'Upload and process new blood test report'
        }
    ],

    // Method to register all blood test routes with the router
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

module.exports = bloodTestRoutes;
