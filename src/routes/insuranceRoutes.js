// routes/insuranceRoutes.js
const insuranceController = require('../controllers/InsuranceController');
const { authenticateToken } = require('../middleware/auth');

const insuranceRoutes = {
    routes: [
        {
            method: 'POST',
            path: '/insurance/upload',
            middleware: [authenticateToken],
            handler: insuranceController.uploadInsuranceDocument,
            description: 'Upload and process an insurance document'
        },
        {
            method: 'GET',
            path: '/insurance/:insuranceId',
            middleware: [authenticateToken],
            handler: insuranceController.getInsurance,
            description: 'Get insurance details by ID'
        },
        {
            method: 'GET',
            path: '/insurance',
            middleware: [authenticateToken],
            handler: insuranceController.getUserInsurances,
            description: 'Get all insurance policies for the authenticated user with optional filters'
        },
        {
            method: 'PATCH',
            path: '/insurance/:insuranceId/status',
            middleware: [authenticateToken],
            handler: insuranceController.updateInsuranceStatus,
            description: 'Update the status of a specific insurance policy'
        },
        {
            method: 'DELETE',
            path: '/insurance/:insuranceId',
            middleware: [authenticateToken],
            handler: insuranceController.deleteInsurance,
            description: 'Delete a specific insurance policy by ID'
        },
        {
            method: 'GET',
            path: '/insurance/stats',
            middleware: [authenticateToken],
            handler: insuranceController.getInsuranceStats,
            description: 'Retrieve insurance statistics for the authenticated user'
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

module.exports = insuranceRoutes;
