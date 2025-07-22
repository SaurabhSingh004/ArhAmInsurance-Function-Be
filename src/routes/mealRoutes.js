const mealController = require('../controllers/MealController');
const { authenticateToken } = require('../middleware/auth');

const mealRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/meals/analyze-image',
            middleware: [authenticateToken],
            handler: mealController.analyzeFoodImage,
            description: 'Analyze food image'
        },
        {
            method: 'POST',
            path: '/meals/analyze-image-macros',
            middleware: [authenticateToken],
            handler: mealController.analyzeFoodImageWithMacros,
            description: 'Analyze food image with macros calculation'
        },
        {
            method: 'GET',
            path: '/meals/search',
            middleware: [authenticateToken],
            handler: mealController.searchMeal,
            description: 'Search meals'
        },
        {
            method: 'POST',
            path: '/meals/add-update',
            middleware: [authenticateToken],
            handler: mealController.addAndUpdateMeal,
            description: 'Add or update meal'
        },
        {
            method: 'GET',
            path: '/meals',
            middleware: [authenticateToken],
            handler: mealController.getMealById,
            description: 'Get meal by ID'
        },
        {
            method: 'PUT',
            path: '/meals/update-meal',
            middleware: [authenticateToken],
            handler: mealController.updateMeal,
            description: 'Update meal'
        },
        {
            method: 'GET',
            path: '/meals/food',
            middleware: [authenticateToken],
            handler: mealController.getFoodById,
            description: 'Get food by ID'
        },
        {
            method: 'GET',
            path: '/meals/today',
            middleware: [authenticateToken],
            handler: mealController.getTodayMeals,
            description: 'Get today\'s meals'
        },
        {
            method: 'GET',
            path: '/meals/day',
            middleware: [authenticateToken],
            handler: mealController.getDateMeals,
            description: 'Get meals for specific date'
        },
        {
            method: 'GET',
            path: '/meals/preferred',
            middleware: [authenticateToken],
            handler: mealController.getPreferredMeals,
            description: 'Get preferred meals for user'
        }
    ],

    // Method to register all meal routes with the router
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

module.exports = mealRoutes;