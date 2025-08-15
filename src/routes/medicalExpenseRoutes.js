// routes/medicalExpenseRoutes.js
const medicalExpenseController = require('../controllers/MedicalExpenseController');
const { authenticateToken } = require('../middleware/auth');

const medicalExpenseRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/medical-expense/create',
            middleware: [authenticateToken],
            handler: medicalExpenseController.createMedicalExpense,
            description: 'Create new medical expense record with patient and provider details'
        },
        {
            method: 'GET',
            path: '/medical-expense/get-all',
            middleware: [authenticateToken],
            handler: medicalExpenseController.getAllMedicalExpenses,
            description: 'Get all medical expenses with pagination, filters, and search functionality'
        },
        {
            method: 'GET',
            path: '/medical-expense/get/:expenseId',
            middleware: [authenticateToken],
            handler: medicalExpenseController.getMedicalExpenseById,
            description: 'Get specific medical expense by ID'
        },
        {
            method: 'PATCH',
            path: ' ',
            middleware: [authenticateToken],
            handler: medicalExpenseController.updateMedicalExpense,
            description: 'Update medical expense details by expense ID'
        },
        {
            method: 'DELETE',
            path: '/medical-expense/delete/:expenseId',
            middleware: [authenticateToken],
            handler: medicalExpenseController.deleteMedicalExpense,
            description: 'Delete (soft delete) medical expense by expense ID'
        },
        {
            method: 'GET',
            path: '/medical-expense/reports/:reportType',
            middleware: [authenticateToken],
            handler: medicalExpenseController.getExpenseReports,
            description: 'Generate expense reports - daily, monthly, or yearly with category breakdown'
        },
        {
            method: 'GET',
            path: '/medical-expense/stats',
            middleware: [authenticateToken],
            handler: medicalExpenseController.getExpenseStats,
            description: 'Get comprehensive expense statistics and insights'
        },
        {
            method: 'GET',
            path: '/medical-expense/categories',
            middleware: [authenticateToken],
            handler: medicalExpenseController.getExpenseCategories,
            description: 'Get available expense categories, payment methods, and relationship options'
        }
    ],

    // Method to register all medical expense routes with the router
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

module.exports = medicalExpenseRoutes;