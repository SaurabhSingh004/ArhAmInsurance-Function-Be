const couponController = require('../controllers/CouponController');
const { authenticateToken } = require('../middleware/auth');

const couponRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/coupon/create',
            middleware: [authenticateToken],
            handler: couponController.createCoupon,
            description: 'Create new coupons with specified count and discount'
        },
        {
            method: 'POST',
            path: '/coupon/deactivate',
            middleware: [authenticateToken],
            handler: couponController.deactivateCoupon,
            description: 'Deactivate a specific coupon'
        },
        {
            method: 'GET',
            path: '/coupon/get-all',
            middleware: [authenticateToken],
            handler: couponController.getAllCoupons,
            description: 'Get all coupons with pagination and filters'
        },
        {
            method: 'PATCH',
            path: '/coupon/edit/:codeId',
            middleware: [authenticateToken],
            handler: couponController.editCoupon,
            description: 'Edit coupon details by coupon ID'
        }
    ],

    // Method to register all coupon routes with the router
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

module.exports = couponRoutes;
