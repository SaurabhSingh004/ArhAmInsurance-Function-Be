// routes/insuranceRoutes.js
const insuranceController = require('../controllers/InsuranceController');
const { authenticateToken } = require('../middleware/auth');

const insuranceRoutes = {
    routes: [
        {
            method: 'POST',
            path: '/upload/insurance',
            middleware: [authenticateToken],
            handler: insuranceController.uploadInsuranceDocument,
            description: 'Upload and process an insurance document'
        },
        {
            method: 'PUT',
            path: '/insurance/:insuranceId',
            middleware: [authenticateToken],
            handler: insuranceController.updateInsuranceDetails,
            description: 'Update insurance details'
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
            path: '/insurance/policies',
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
        },
        {
            method: 'GET',
            path: '/insurance/categories',
            middleware: [authenticateToken],
            handler: insuranceController.getActiveCategories,
            description: 'Retrieve insurance statistics for the authenticated user'
        },
        {
            method: 'POST',
            path: '/insurance/query/initialize',
            middleware: [authenticateToken],
            handler: insuranceController.initializeQuery,
            description: 'Initialize insurance document query conversation'
        },
        {
            method: 'POST',
            path: '/insurance/query/ask',
            middleware: [authenticateToken],
            handler: insuranceController.queryDocument,
            description: 'Query insurance document in existing conversation'
        },
        {
            method: 'GET',
            path: '/insurance/conversations',
            middleware: [authenticateToken],
            handler: insuranceController.getUserConversations,
            description: 'Get all conversations for user (summary view)'
        },
        {
            method: 'GET',
            path: '/insurance/conversations/:chatId',
            middleware: [authenticateToken],
            handler: insuranceController.getConversationHistory,
            description: 'Get specific conversation history'
        },
        {
            method: 'GET',
            path: '/insurance/conversations/history/all',
            middleware: [authenticateToken],
            handler: insuranceController.getConversationHistory,
            description: 'Get all conversation histories for user'
        },
        {
            method: 'DELETE',
            path: '/insurance/conversations/:chatId',
            middleware: [authenticateToken],
            handler: insuranceController.deleteConversation,
            description: 'Delete conversation'
        },
        {
            method: 'GET',
            path: '/insurance/conversations/stats/summary',
            middleware: [authenticateToken],
            handler: insuranceController.getConversationStats,
            description: 'Get conversation statistics for user'
        },
        {
            method: 'POST',
            path: '/insurance/compare',
            middleware: [authenticateToken],
            handler: insuranceController.compareDocuments,
            description: 'Compare multiple insurance documents'
        },
        {
            method: 'GET',
            path: '/insurance/types',
            middleware: [],
            handler: insuranceController.getInsurancesToBuy,
            description: 'Get Mauritius insurance companies by type (health, travel, vehicle, cyber, pet, home)'
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
