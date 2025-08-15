// controllers/MedicalExpenseController.js
const MedicalExpenseService = require('../services/MedicalExpenseService');

class MedicalExpenseController {
    /**
     * Create new medical expense
     * POST /api/medical-expense/create
     */
    createMedicalExpense = async (request, context) => {
        try {
            const expenseData = await request.json() || {};
            const userId = context.user?._id;

            // Validate required fields
            const requiredFields = ['title', 'amount', 'category'];
            const missingFields = requiredFields.filter(field => !expenseData[field]);
            
            if (missingFields.length > 0) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: `Missing required fields: ${missingFields.join(', ')}`,
                        data: null
                    }
                };
            }

            const medicalExpense = await MedicalExpenseService.createMedicalExpense(expenseData, userId);

            return {
                status: 201,
                jsonBody: {
                    success: true,
                    data: medicalExpense,
                    message: 'Medical expense created successfully'
                }
            };

        } catch (error) {
            context.error('Error creating medical expense:', error);

            // Handle validation errors
            if (error.message.includes('Missing required field') ||
                error.message.includes('must be greater than') ||
                error.message.includes('is required') ||
                error.message.includes('Invalid')) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            // Handle duplicate errors
            if (error.code === 11000) {
                return {
                    status: 409,
                    jsonBody: {
                        success: false,
                        message: 'Duplicate expense ID. Please try again.',
                        data: null
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to create medical expense',
                    data: null
                }
            };
        }
    }

    /**
     * Get all medical expenses with filters and pagination
     * GET /api/medical-expense/get-all
     */
    getAllMedicalExpenses = async (request, context) => {
        try {
            const userId = context.user?._id;
            const url = new URL(request.url);
            const searchParams = url.searchParams;

            // Extract pagination parameters
            const pagination = {
                page: parseInt(searchParams.get('page')) || 1,
                limit: parseInt(searchParams.get('limit')) || 10,
                sortBy: searchParams.get('sortBy') || 'expenseDate',
                sortOrder: searchParams.get('sortOrder') || 'desc'
            };

            // Validate pagination limits
            pagination.limit = Math.min(pagination.limit, 100); // Max 100 items per page
            pagination.page = Math.max(pagination.page, 1); // Min page 1

            // Extract filter parameters
            const filters = {};
            
            if (searchParams.get('category')) {
                filters.category = searchParams.get('category');
            }
            if (searchParams.get('paymentMethod')) {
                filters.paymentMethod = searchParams.get('paymentMethod');
            }
            if (searchParams.get('patientRelationship')) {
                filters.patientRelationship = searchParams.get('patientRelationship');
            }
            if (searchParams.get('startDate')) {
                filters.startDate = searchParams.get('startDate');
            }
            if (searchParams.get('endDate')) {
                filters.endDate = searchParams.get('endDate');
            }
            if (searchParams.get('minAmount')) {
                filters.minAmount = searchParams.get('minAmount');
            }
            if (searchParams.get('maxAmount')) {
                filters.maxAmount = searchParams.get('maxAmount');
            }
            if (searchParams.get('insuranceClaimed')) {
                filters.insuranceClaimed = searchParams.get('insuranceClaimed');
            }
            if (searchParams.get('search')) {
                filters.search = searchParams.get('search');
            }

            const result = await MedicalExpenseService.getAllMedicalExpenses(userId, filters, pagination);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Medical expenses retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting medical expenses:', error);

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to retrieve medical expenses',
                    data: null
                }
            };
        }
    }

    /**
     * Delete medical expense
     * DELETE /api/medical-expense/delete/:expenseId
     */
    deleteMedicalExpense = async (request, context) => {
        try {
            const { expenseId } = request.params || {};
            const userId = context.user?._id;

            if (!expenseId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Expense ID is required',
                        data: null
                    }
                };
            }

            const result = await MedicalExpenseService.deleteMedicalExpense(expenseId, userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: { deleted: result },
                    message: 'Medical expense deleted successfully'
                }
            };

        } catch (error) {
            context.error('Error deleting medical expense:', error);

            if (error.message === 'Medical expense not found') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to delete medical expense',
                    data: null
                }
            };
        }
    }

    /**
     * Get medical expense by ID
     * GET /api/medical-expense/get/:expenseId
     */
    getMedicalExpenseById = async (request, context) => {
        try {
            const { expenseId } = request.params || {};
            const userId = context.user?._id;

            if (!expenseId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Expense ID is required',
                        data: null
                    }
                };
            }

            const expense = await MedicalExpenseService.getMedicalExpenseById(expenseId, userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: expense,
                    message: 'Medical expense retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting medical expense:', error);

            if (error.message === 'Medical expense not found') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to retrieve medical expense',
                    data: null
                }
            };
        }
    }

    /**
     * Update medical expense
     * PATCH /api/medical-expense/update/:expenseId
     */
    updateMedicalExpense = async (request, context) => {
        try {
            const { expenseId } = request.params || {};
            const updateData = await request.json() || {};
            const userId = context.user?._id;

            if (!expenseId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Expense ID is required',
                        data: null
                    }
                };
            }

            if (!updateData || Object.keys(updateData).length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Update data is required',
                        data: null
                    }
                };
            }

            // Check for protected fields
            const protectedFields = ['_id', 'userId', 'expenseId', 'createdAt', 'updatedAt'];
            const invalidFields = Object.keys(updateData).filter(field => protectedFields.includes(field));
            
            if (invalidFields.length > 0) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: `Cannot update protected fields: ${invalidFields.join(', ')}`,
                        data: null
                    }
                };
            }

            const updatedExpense = await MedicalExpenseService.updateMedicalExpense(expenseId, updateData, userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: updatedExpense,
                    message: 'Medical expense updated successfully'
                }
            };

        } catch (error) {
            context.error('Error updating medical expense:', error);

            if (error.message === 'Medical expense not found') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            if (error.message.includes('Invalid') ||
                error.message.includes('required') ||
                error.message.includes('must be') ||
                error.message.includes('Cannot update')) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to update medical expense',
                    data: null
                }
            };
        }
    }

    /**
     * Get expense reports (daily, monthly, yearly)
     * GET /api/medical-expense/reports/:reportType
     */
    getExpenseReports = async (request, context) => {
        try {
            const { reportType } = request.params || {};
            const userId = context.user?._id;
            const url = new URL(request.url);
            const searchParams = url.searchParams;

            // Validate report type
            const validReportTypes = ['daily', 'monthly', 'yearly'];
            if (!validReportTypes.includes(reportType)) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Invalid report type. Must be: daily, monthly, or yearly',
                        data: null
                    }
                };
            }

            // Extract options
            const options = {
                year: parseInt(searchParams.get('year')) || new Date().getFullYear(),
                month: searchParams.get('month') ? parseInt(searchParams.get('month')) : null,
                currency: searchParams.get('currency') || 'INR'
            };

            // Validate year
            const currentYear = new Date().getFullYear();
            if (options.year < 2000 || options.year > currentYear + 1) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Invalid year. Year must be between 2000 and current year',
                        data: null
                    }
                };
            }

            // Validate month for daily reports
            if (reportType === 'daily') {
                if (!options.month || options.month < 1 || options.month > 12) {
                    return {
                        status: 400,
                        jsonBody: {
                            success: false,
                            message: 'Month (1-12) is required for daily reports',
                            data: null
                        }
                    };
                }
            }

            const report = await MedicalExpenseService.getExpenseReports(userId, reportType, options);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: report,
                    message: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} expense report generated successfully`
                }
            };

        } catch (error) {
            context.error('Error generating expense report:', error);

            if (error.message.includes('required') ||
                error.message.includes('Invalid') ||
                error.message.includes('must be')) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to generate expense report',
                    data: null
                }
            };
        }
    }

    /**
     * Get expense statistics and insights
     * GET /api/medical-expense/stats
     */
    getExpenseStats = async (request, context) => {
        try {
            const userId = context.user?._id;
            const url = new URL(request.url);
            const searchParams = url.searchParams;

            const options = {
                year: parseInt(searchParams.get('year')) || new Date().getFullYear(),
                month: searchParams.get('month') ? parseInt(searchParams.get('month')) : null
            };

            // Get comprehensive statistics
            const [monthlyReport, yearlyReport] = await Promise.all([
                options.month 
                    ? MedicalExpenseService.getExpenseReports(userId, 'monthly', { year: options.year })
                    : null,
                MedicalExpenseService.getExpenseReports(userId, 'yearly', { year: options.year })
            ]);

            const stats = {
                currentYear: yearlyReport.summary,
                currentMonth: monthlyReport?.summary || null,
                topCategories: yearlyReport.categoryBreakdown.slice(0, 5),
                insights: yearlyReport.insights,
                trends: {
                    yearlyGrowth: null, // Could be calculated with previous year data
                    monthlyAverage: Math.round(yearlyReport.summary.totalExpenses / 12),
                    dailyAverage: Math.round(yearlyReport.summary.totalExpenses / 365)
                }
            };

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: stats,
                    message: 'Expense statistics retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting expense statistics:', error);

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to retrieve expense statistics',
                    data: null
                }
            };
        }
    }

    /**
     * Get expense categories and their details
     * GET /api/medical-expense/categories
     */
    getExpenseCategories = async (request, context) => {
        try {
            const categories = [
                { 
                    value: 'consultation', 
                    label: 'Consultation', 
                    description: 'Doctor visits, specialist consultations' 
                },
                { 
                    value: 'medication', 
                    label: 'Medication', 
                    description: 'Prescribed medicines, pharmacy purchases' 
                },
                { 
                    value: 'lab_tests', 
                    label: 'Lab Tests', 
                    description: 'Blood tests, urine tests, diagnostic tests' 
                },
                { 
                    value: 'imaging', 
                    label: 'Imaging', 
                    description: 'X-rays, MRI, CT scans, ultrasounds' 
                },
                { 
                    value: 'surgery', 
                    label: 'Surgery', 
                    description: 'Surgical procedures, operations' 
                },
                { 
                    value: 'hospitalization', 
                    label: 'Hospitalization', 
                    description: 'Hospital stays, room charges' 
                },
                { 
                    value: 'emergency', 
                    label: 'Emergency', 
                    description: 'Emergency room visits, urgent care' 
                },
                { 
                    value: 'dental', 
                    label: 'Dental', 
                    description: 'Dental treatments, cleanings, procedures' 
                },
                { 
                    value: 'vision', 
                    label: 'Vision', 
                    description: 'Eye exams, glasses, contact lenses' 
                },
                { 
                    value: 'therapy', 
                    label: 'Therapy', 
                    description: 'Physical therapy, counseling, rehabilitation' 
                },
                { 
                    value: 'preventive_care', 
                    label: 'Preventive Care', 
                    description: 'Vaccinations, health screenings, check-ups' 
                },
                { 
                    value: 'medical_equipment', 
                    label: 'Medical Equipment', 
                    description: 'Medical devices, equipment purchases' 
                },
                { 
                    value: 'insurance_premium', 
                    label: 'Insurance Premium', 
                    description: 'Health insurance payments' 
                },
                { 
                    value: 'other', 
                    label: 'Other', 
                    description: 'Other medical expenses not listed above' 
                }
            ];

            const paymentMethods = [
                { value: 'cash', label: 'Cash' },
                { value: 'card', label: 'Card' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'insurance', label: 'Insurance' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'online', label: 'Online Payment' },
                { value: 'other', label: 'Other' }
            ];

            const relationships = [
                { value: 'self', label: 'Self' },
                { value: 'spouse', label: 'Spouse' },
                { value: 'child', label: 'Child' },
                { value: 'parent', label: 'Parent' },
                { value: 'sibling', label: 'Sibling' },
                { value: 'other', label: 'Other' }
            ];

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: {
                        categories,
                        paymentMethods,
                        relationships
                    },
                    message: 'Expense categories retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting expense categories:', error);

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to retrieve expense categories',
                    data: null
                }
            };
        }
    }
}

module.exports = new MedicalExpenseController();