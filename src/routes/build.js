const buildFunctionalityController = require('../controllers/buildFunctionalityController');
const { authenticateToken } = require('../middleware/auth');

const buildFunctionalityRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'GET',
            path: '/feature-build/getAll',
            middleware: [],
            handler: buildFunctionalityController.getAllBuilds,
            description: 'Get all builds with their features'
        },
        {
            method: 'GET',
            path: '/feature-build/:buildNumber',
            middleware: [],
            handler: buildFunctionalityController.getBuildFunctionality,
            description: 'Get build functionality by build number (public access)'
        },
        {
            method: 'POST',
            path: '/feature-build',
            middleware: [],
            handler: buildFunctionalityController.addBuildFunctionality,
            description: 'Add or update build functionality'
        },
        {
            method: 'PATCH',
            path: '/feature-build/:buildId',
            middleware: [],
            handler: buildFunctionalityController.toggleFeature,
            description: 'Toggle a specific feature for a build'
        },
        {
            method: 'DELETE',
            path: '/feature-build/:buildId',
            middleware: [],
            handler: buildFunctionalityController.deleteFeature,
            description: 'Delete a specific feature from a build'
        },
        {
            method: 'GET',
            path: '/feature-build/:buildNumber/feature/:featureName',
            middleware: [],
            handler: buildFunctionalityController.isFeatureEnabled,
            description: 'Check if a specific feature is enabled for a build (public access)'
        },
        {
            method: 'DELETE',
            path: '/feature-build/delete/:buildNumber',
            middleware: [],
            handler: buildFunctionalityController.deleteBuildFunctionality,
            description: 'Delete build functionality if inactive'
        },
        {
            method: 'PATCH',
            path: '/feature-build/toggle',
            middleware: [],
            handler: buildFunctionalityController.toggleBuildActiveStatus,
            description: 'Toggle isActive status of a build'
        }
    ],

    // Method to register all build functionality routes with the router
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

module.exports = buildFunctionalityRoutes;
