const subscriptionController = require('../controllers/SubscriptionController');
const { authenticateToken } = require('../middleware/auth');

const subscriptionRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'GET',
            path: '/subscription/plans',
            middleware: [authenticateToken],
            handler: subscriptionController.getSubscriptionPlans,
            description: 'Get all subscription plans'
        },
        {
            method: 'POST',
            path: '/subscription/apply-discount',
            middleware: [authenticateToken],
            handler: subscriptionController.applyDiscountByCoupon,
            description: 'Apply discount by coupon code'
        },
        {
            method: 'POST',
            path: '/subscription/create-plan',
            middleware: [authenticateToken],
            handler: subscriptionController.createSubscriptionPlan,
            description: 'Create a new subscription plan'
        },
        {
            method: 'POST',
            path: '/subscription/seed-plans',
            middleware: [authenticateToken],
            handler: subscriptionController.createPredefinedPlans,
            description: 'Create predefined subscription plans'
        },
        {
            method: 'PATCH',
            path: '/subscription/subscribe',
            middleware: [authenticateToken],
            handler: subscriptionController.subscribeUser,
            description: 'Subscribe user to a plan'
        }
    ],

    // Method to register all subscription routes with the router
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

module.exports = subscriptionRoutes;