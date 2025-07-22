const GoalsController = require('../controllers/GoalsController');
const { authenticateToken } = require('../middleware/auth');
const goalsRoutes = {
    routes: [
        {
            method: 'POST',
            path: '/goals',
            middleware: [authenticateToken],
            handler: GoalsController.createGoals,
            description: 'Create and Get all goals'
        },
        {
            method: 'GET',
            path: '/goals',
            middleware: [authenticateToken],
            handler: GoalsController.getGoals,
            description: 'Get all goals for authenticated user'
        },
        {
            method: 'GET',
            path: '/goals/weight',
            middleware: [authenticateToken],
            handler: GoalsController.getCurrentGoal,
            description: 'Get current weight goal'
        },
        {
            method: 'PUT',
            path: '/goals/weight',
            middleware: [authenticateToken],
            handler: GoalsController.updateWeightGoal,
            description: 'Update weight goal'
        },
        {
            method: 'GET',
            path: '/goals/daily-targets',
            middleware: [authenticateToken],
            handler: GoalsController.getDailyTargets,
            description: 'Get daily targets'
        },
        {
            method: 'PUT',
            path: '/goals/secondary/:goalId',
            middleware: [authenticateToken],
            handler: GoalsController.updateSecondaryGoal,
            description: 'Update secondary goal'
        },
        {
            method: 'PUT',
            path: '/goals',
            middleware: [authenticateToken],
            handler: GoalsController.updateGoals,
            description: 'Update general goals'
        },
        {
            method: 'DELETE',
            path: '/goals',
            middleware: [authenticateToken],
            handler: GoalsController.deleteGoals,
            description: 'Delete goals'
        },
        {
            method: 'GET',
            path: '/goals/getAll',
            middleware: [authenticateToken],
            handler: GoalsController.getAllUserGoals,
            description: 'Admin route to get all user goals'
        },
        {
            method: 'PATCH',
            path: '/goals/weight/status',
            middleware: [authenticateToken],
            handler: GoalsController.updateWeightGoalStatus,
            description: 'Update weight goal status'
        }
    ],
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

module.exports = goalsRoutes;