const medicineController = require('../controllers/MedicineController');
const { authenticateToken } = require('../middleware/auth');

const medicineRoutes = {
    // Route definitions with paths, methods, middleware, and handlers
    routes: [
        {
            method: 'POST',
            path: '/medicineSchedule/add-medicine',
            middleware: [authenticateToken],
            handler: medicineController.addMedicineToSchedule,
            description: 'Add new medicine schedule'
        },
        {
            method: 'POST',
            path: '/medicineSchedule/add-new-medicine',
            middleware: [authenticateToken],
            handler: medicineController.createMedicine,
            description: 'Create a new medicine'
        },
        {
            method: 'PUT',
            path: '/medicineSchedule/update-medicine-is-taken/:date',
            middleware: [authenticateToken],
            handler: medicineController.updateMedicineStatus,
            description: 'Update medicine taken status'
        },
        {
            method: 'POST',
            path: '/medicineSchedule/seed-medicines',
            middleware: [authenticateToken],
            handler: medicineController.seedMedicines,
            description: 'Seed medicines database'
        },
        {
            method: 'GET',
            path: '/medicineSchedule/search',
            middleware: [authenticateToken],
            handler: medicineController.searchMedicines,
            description: 'Search medicines'
        },
        {
            method: 'GET',
            path: '/medicineSchedule',
            middleware: [authenticateToken],
            handler: medicineController.getAllMedicines,
            description: 'Get all medicines'
        },
        {
            method: 'GET',
            path: '/medicineSchedule/:date',
            middleware: [authenticateToken],
            handler: medicineController.getMedicineSchedule,
            description: 'Get medicine schedule for a specific date'
        },
        {
            method: 'GET',
            path: '/medicineSchedule/details/:id',
            middleware: [authenticateToken],
            handler: medicineController.getMedicineById,
            description: 'Get medicine by ID'
        },
        {
            method: 'PUT',
            path: '/medicineSchedule/:id',
            middleware: [authenticateToken],
            handler: medicineController.updateMedicine,
            description: 'Update medicine by ID'
        },
        {
            method: 'DELETE',
            path: '/medicineSchedule/:id',
            middleware: [authenticateToken],
            handler: medicineController.deleteMedicine,
            description: 'Delete medicine by ID'
        }
    ],

    // Method to register all medicine routes with the router
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

module.exports = medicineRoutes;