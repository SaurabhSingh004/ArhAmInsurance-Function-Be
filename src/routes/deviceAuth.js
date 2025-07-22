const deviceAuthController = require('../controllers/DeviceAuthController');
const { authenticateToken } = require('../middleware/auth');

const deviceAuthRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/device-auth/register',
            middleware: [],
            handler: deviceAuthController.registerUser,
            description: 'Register user via device authentication'
        },
        {
            method: 'POST',
            path: '/device-auth/login',
            middleware: [],
            handler: deviceAuthController.loginUser,
            description: 'Login user via device authentication'
        },
        {
            method: 'POST',
            path: '/device-auth/reset-password-request',
            middleware: [],
            handler: deviceAuthController.resetPasswordRequest,
            description: 'Request password reset for device users'
        },
        {
            method: 'POST',
            path: '/device-auth/verify-reset-token',
            middleware: [],
            handler: deviceAuthController.verifyResetToken,
            description: 'Verify password reset token for device users'
        },
        {
            method: 'POST',
            path: '/device-auth/reset-password',
            middleware: [],
            handler: deviceAuthController.resetPassword,
            description: 'Reset password for device users'
        },
        {
            method: 'POST',
            path: '/device-auth/social/google',
            middleware: [],
            handler: deviceAuthController.googleCallback,
            description: 'Google social authentication for devices'
        },
        {
            method: 'POST',
            path: '/device-auth/social/apple',
            middleware: [],
            handler: deviceAuthController.appleCallback,
            description: 'Apple social authentication for devices'
        },
        {
            method: 'POST',
            path: '/device-auth/verify-login-otp',
            middleware: [],
            handler: deviceAuthController.verifyLoginOTP,
            description: 'Verify OTP for device login'
        },
        {
            method: 'POST',
            path: '/device-auth/send-login-otp',
            middleware: [],
            handler: deviceAuthController.sendLoginOTP,
            description: 'Send OTP for device login'
        },
        {
            method: 'POST',
            path: '/device-auth/updatePhoneVerify',
            middleware: [authenticateToken],
            handler: deviceAuthController.updatePhoneVerify,
            description: 'Update and verify phone for device users'
        },
        {
            method: 'POST',
            path: '/device-auth/verify-phone',
            middleware: [],
            handler: deviceAuthController.verifyPhone,
            description: 'Verify phone number for device users'
        },
        {
            method: 'GET',
            path: '/device-auth/verify-email/:token',
            middleware: [],
            handler: deviceAuthController.verifyEmail,
            description: 'Verify email with token for device users'
        },
        {
            method: 'GET',
            path: '/device-auth/resend-verification',
            middleware: [authenticateToken],
            handler: deviceAuthController.resendVerification,
            description: 'Resend verification for device users'
        }
    ],

    // Method to register all device auth routes with the router
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

module.exports = deviceAuthRoutes;
