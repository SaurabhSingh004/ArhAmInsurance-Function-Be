const emiController = require('../controllers/EmiController');
const { authenticateToken } = require('../middleware/auth');

const emiRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: ' ',
            middleware: [], // Public route - no authentication required
            handler: emiController.calculateEmi,
            description: 'Calculate EMI for given loan parameters (principal, interest rate, tenure)'
        },
        {
            method: 'POST',
            path: '/emi/loan-amount',
            middleware: [], // Public route - no authentication required
            handler: emiController.calculateLoanAmount,
            description: 'Calculate maximum loan amount based on affordable EMI'
        },
        {
            method: 'POST',
            path: '/emi/compare',
            middleware: [], // Public route - no authentication required
            handler: emiController.compareLoanOptions,
            description: 'Compare multiple loan options and get best recommendations'
        }
    ],

    // Method to register all EMI routes with the router
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

module.exports = emiRoutes;