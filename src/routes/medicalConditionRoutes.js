const medicalConditionController = require('../controllers/MedicalConditionsController');
const { authenticateToken } = require('../middleware/auth');

const medicalConditionRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/medicalConditions',
            middleware: [authenticateToken],
            handler: medicalConditionController.addConditions,
            description: 'Add new medical conditions'
        },
        {
            method: 'GET',
            path: '/medicalConditions/active',
            middleware: [authenticateToken],
            handler: medicalConditionController.getActiveConditions,
            description: 'Get only active medical conditions for a user'
        },
        {
            method: 'GET',
            path: '/medicalConditions',
            middleware: [authenticateToken],
            handler: medicalConditionController.getMedicalConditions,
            description: 'Get all medical conditions'
        },
        {
            method: 'GET',
            path: '/medicalConditions/type/:type',
            middleware: [authenticateToken],
            handler: medicalConditionController.getConditionsByType,
            description: 'Get conditions by type for authenticated user'
        },
        {
            method: 'PUT',
            path: '/medicalConditions/:conditionId',
            middleware: [authenticateToken],
            handler: medicalConditionController.updateCondition,
            description: 'Update a specific medical condition'
        },
        {
            method: 'DELETE',
            path: '/medicalConditions/:conditionId',
            middleware: [authenticateToken],
            handler: medicalConditionController.deleteCondition,
            description: 'Delete (soft delete) a medical condition'
        }
    ],

    // Method to register all medical condition routes with the router
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

module.exports = medicalConditionRoutes;