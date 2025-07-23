// routes/claimRoutes.js
const claimController = require('../controllers/ClaimController');
const { authenticateToken } = require('../middleware/auth');

const claimRoutes = {
   // Route definitions with paths, methods, middleware, and handlers
   routes: [
       {
           method: 'POST',
           path: '/claim',
           middleware: [authenticateToken],
           handler: claimController.createClaim,
           description: 'Create a new insurance claim'
       },
       {
           method: 'POST',
           path: '/claim/:claimId/documents',
           middleware: [authenticateToken],
           handler: claimController.uploadClaimDocuments,
           description: 'Upload supporting documents for a claim'
       },
       {
           method: 'GET',
           path: '/claim/:claimId',
           middleware: [authenticateToken],
           handler: claimController.getClaim,
           description: 'Get claim details by claim ID'
       },
       {
           method: 'GET',
           path: '/claim',
           middleware: [authenticateToken],
           handler: claimController.getUserClaims,
           description: 'Get all claims for authenticated user with optional filters'
       },
       {
           method: 'PUT',
           path: '/claim/:claimId/status',
           middleware: [authenticateToken],
           handler: claimController.updateClaimStatus,
           description: 'Update claim status (for admin/assessor use)'
       },
       {
           method: 'POST',
           path: '/claim/:claimId/notes',
           middleware: [authenticateToken],
           handler: claimController.addProcessingNote,
           description: 'Add processing note to claim'
       },
       {
           method: 'GET',
           path: '/claim/insurance/:insuranceId',
           middleware: [authenticateToken],
           handler: claimController.getClaimsByInsurance,
           description: 'Get all claims for a specific insurance policy'
       },
       {
           method: 'GET',
           path: '/claim/stats/summary',
           middleware: [authenticateToken],
           handler: claimController.getClaimStats,
           description: 'Get claim statistics for authenticated user'
       },
       {
           method: 'DELETE',
           path: '/claim/:claimId',
           middleware: [authenticateToken],
           handler: claimController.deleteClaim,
           description: 'Delete a claim (only allowed for submitted claims)'
       }
   ],

   // Method to register all claim routes with the router
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

module.exports = claimRoutes;