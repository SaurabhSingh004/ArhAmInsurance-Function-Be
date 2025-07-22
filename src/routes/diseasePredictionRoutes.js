const diseasePredictionController = require('../controllers/DiseasePredictionController');
const { authenticateToken } = require('../middleware/auth');

const diseasePredictionRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/risk-predictions',
            middleware: [authenticateToken],
            handler: diseasePredictionController.createRiskPredictions,
            description: 'Create disease risk predictions based on user input'
        },
        {
            method: 'GET',
            path: '/risk-predictions',
            middleware: [authenticateToken],
            handler: diseasePredictionController.getUniqueDiseaseRiskSummary,
            description: 'Get unique disease risk summary for authenticated user'
        },
        {
            method: 'GET',
            path: '/risk-predictions/:id/summary',
            middleware: [authenticateToken],
            handler: diseasePredictionController.getDiseaseRiskSummary,
            description: 'Get disease risk summary by prediction ID'
        },
        {
            method: 'PATCH',
            path: '/risk-predictions/:id/symptom',
            middleware: [authenticateToken],
            handler: diseasePredictionController.updateSymptomTracking,
            description: 'Update symptom tracking for specific risk prediction'
        }
    ],

    // Method to register all disease prediction routes with the router
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

module.exports = diseasePredictionRoutes;