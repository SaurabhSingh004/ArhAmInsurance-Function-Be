const UserDocumentController = require('../controllers/UploadDocumentController');
const { authenticateToken } = require('../middleware/auth');

const userDocumentRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/documents/upload',
            middleware: [authenticateToken],
            handler: UserDocumentController.uploadDocument,
            description: 'Upload a personal document for authenticated user'
        },
        {
            method: 'GET',
            path: '/documents/user',
            middleware: [authenticateToken],
            handler: UserDocumentController.getUserDocuments,
            description: 'Get all documents for a specific user'
        },
        {
            method: 'GET',
            path: '/documents',
            middleware: [authenticateToken],
            handler: UserDocumentController.getSpecificTypeUserDocument,
            description: 'Get documents by type for authenticated user with optional filters'
        },
        {
            method: 'DELETE',
            path: '/documents/:documentId',
            middleware: [authenticateToken],
            handler: UserDocumentController.deleteDoc,
            description: 'Delete a specific document by ID for authenticated user'
        }
    ],

    // Method to register all user document routes with the router
    registerRoutes: function(router) {
        this.routes.forEach(route => {
            const { method, path, middleware, handler, description } = route;
            
            // Log route registration for debugging
            console.log(`Registering ${method} ${path} - ${description}`);
            
            if (middleware && middleware.length > 0) {
                router.addRoute(method, path, [...middleware, handler]);
            } else {
                router.addRoute(method, path, handler);
            }
        });
    },

    // Method to get route information (useful for documentation)
    getRouteInfo: function() {
        return this.routes.map(route => ({
            endpoint: `${route.method} ${route.path}`,
            description: route.description,
            requiresAuth: route.middleware?.includes(authenticateToken) || false
        }));
    }
};

module.exports = userDocumentRoutes;