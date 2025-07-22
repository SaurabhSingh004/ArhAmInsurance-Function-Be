const dietPlanController = require('../controllers/dietPlanController');
const { authenticateToken } = require('../middleware/auth');

const dietPlanRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        // Travel diet plan (public route)
        {
            method: 'POST',
            path: '/dietPlan/travel',
            middleware: [],
            handler: dietPlanController.generateTravelPersonalizedDietPlan,
            description: 'Generate travel personalized diet plan (public access)'
        },
        {
            method: 'GET',
            path: '/dietPlan/travel-diet-plan/:dietPlanId',
            middleware: [],
            handler: dietPlanController.getDietPlanById,
            description: 'Get travel diet plan by ID (public access)'
        },

        // Protected diet plan routes
        {
            method: 'POST',
            path: '/dietplan',
            middleware: [authenticateToken],
            handler: dietPlanController.generatePersonalizedDietPlan,
            description: 'Generate personalized diet plan for authenticated user'
        },
        {
            method: 'GET',
            path: '/dietplan',
            middleware: [authenticateToken],
            handler: dietPlanController.getDietForDate,
            description: 'Get diet plan for specific date'
        },
        {
            method: 'GET',
            path: '/dietPlan/get-all',
            middleware: [authenticateToken],
            handler: dietPlanController.getDietPlansByUser,
            description: 'Get all diet plans for authenticated user'
        },
        {
            method: 'DELETE',
            path: '/dietPlan/:dietPlanId',
            middleware: [authenticateToken],
            handler: dietPlanController.deleteDietPlan,
            description: 'Delete a specific diet plan'
        },
        {
            method: 'POST',
            path: '/dietPlan/meal-completion',
            middleware: [authenticateToken],
            handler: dietPlanController.handleMealCompletion,
            description: 'Handle meal completion in diet plan'
        },
        {
            method: 'POST',
            path: '/dietPlan/add-meal',
            middleware: [authenticateToken],
            handler: dietPlanController.addMeal,
            description: 'Add meal to diet plan'
        },
        {
            method: 'POST',
            path: '/dietPlan/remove-meal',
            middleware: [authenticateToken],
            handler: dietPlanController.removeMeal,
            description: 'Remove meal from diet plan'
        },
        {
            method: 'GET',
            path: '/dietPlan/daily-log',
            middleware: [authenticateToken],
            handler: dietPlanController.getDailyDietLog,
            description: 'Get daily diet log for authenticated user'
        }
    ],

    // Method to register all diet plan routes with the router
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

module.exports = dietPlanRoutes;
