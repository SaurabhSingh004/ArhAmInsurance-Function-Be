const paymentController = require('../controllers/PaymentController');
const { authenticateToken } = require('../middleware/auth');

const paymentRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/payment/stripe-payment-intent',
            middleware: [authenticateToken],
            handler: paymentController.createStripePaymentIntent,
            description: 'Create Stripe payment intent for processing payments'
        }
    ],

    // Method to register all payment routes with the router
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

module.exports = paymentRoutes;