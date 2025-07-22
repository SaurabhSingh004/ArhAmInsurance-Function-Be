// controllers/insuranceController.js
const InsuranceService = require('../services/InsuranceService');
const ClaimService = require('../services/ClaimService');

class InsuranceController {

    /**
     * Upload and process insurance document
     */
    uploadInsuranceDocument = async (request, context) => {
        try {
            // Extract user ID from request (assuming it's set by auth middleware)
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User authentication required'
                    }
                };
            }

            const result = await InsuranceService.uploadInsuranceDocument(
                request.files.file.data, 
                request.files.file.name || request.files.file.originalname, 
                request.files.file.mimetype, 
                userId
            );

            return {
                status: 201,
                jsonBody: result
            };

        } catch (error) {
            context.error('Error uploading insurance document:', error);
            
            // Handle specific error types
            if (error.message.includes('not active')) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            // Handle validation and business logic errors
            if (error.message.includes('Failed to upload') || 
                error.message.includes('AI service') ||
                error.message.includes('Unsupported file type') ||
                error.message.includes('exceeds maximum size') ||
                error.message.includes('Missing required field') ||
                error.message.includes('Invalid') ||
                error.message.includes('must be') ||
                error.message.includes('already exists') ||
                error.message.includes('Duplicate value') ||
                error.message.includes('Validation failed') ||
                error.message.includes('Database operation failed') ||
                error.message.includes('Failed to create insurance record') ||
                error.message.includes('Filename') ||
                error.message.includes('File')) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            // Handle service unavailable errors
            if (error.message.includes('Database connection error')) {
                return {
                    status: 503,
                    jsonBody: {
                        success: false,
                        message: 'Service temporarily unavailable. Please try again later.',
                        data: null
                    }
                };
            }

            // Fallback for unexpected errors
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'An unexpected error occurred. Please try again later.',
                    data: null
                }
            };
        }
    }

    /**
     * Get insurance by ID
     */
    getInsurance = async (request, context) => {
        try {
            const { insuranceId } = request.params || {};
            const userId = context.user?._id;

            if (!insuranceId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Insurance ID is required',
                        data: null
                    }
                };
            }

            const insurance = await InsuranceService.getInsuranceById(insuranceId, userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: insurance,
                    message: 'Insurance retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting insurance:', error);

            if (error.message === 'Insurance not found') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            // Handle validation errors
            if (error.message.includes('Invalid') || error.message.includes('required')) {
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
                    message: 'Failed to retrieve insurance',
                    data: null
                }
            };
        }
    }

    /**
     * Get all insurances for a user
     */
    getUserInsurances = async (request, context) => {
        try {
            const userId = context.user?._id;
            const { status, productName } = request.query || {};

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User authentication required',
                        data: null
                    }
                };
            }

            const filters = {};
            if (status) filters.status = status;
            if (productName) filters.productName = new RegExp(productName, 'i');

            const insurances = await InsuranceService.getUserInsurances(userId, filters);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: insurances,
                    message: 'Insurances retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting user insurances:', error);

            // Handle validation errors
            if (error.message.includes('Invalid') || error.message.includes('required')) {
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
                    message: 'Failed to retrieve insurances',
                    data: null
                }
            };
        }
    }

    /**
     * Update insurance status
     */
    updateInsuranceStatus = async (request, context) => {
        try {
            const { insuranceId } = request.params || {};
            const { status } = await request.json() || {};
            const userId = context.user?._id;

            if (!insuranceId || !status) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Insurance ID and status are required',
                        data: null
                    }
                };
            }

            const insurance = await InsuranceService.updateInsuranceStatus(insuranceId, status, userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: insurance,
                    message: 'Insurance status updated successfully'
                }
            };

        } catch (error) {
            context.error('Error updating insurance status:', error);

            if (error.message === 'Insurance not found') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            // Handle validation errors
            if (error.message.includes('Invalid status') ||
                error.message.includes('Invalid') ||
                error.message.includes('required') ||
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
                    message: 'Failed to update insurance status',
                    data: null
                }
            };
        }
    }

    /**
     * Delete insurance
     */
    deleteInsurance = async (request, context) => {
        try {
            const { insuranceId } = request.params || {};
            const userId = context.user?._id;

            if (!insuranceId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Insurance ID is required',
                        data: null
                    }
                };
            }

            await InsuranceService.deleteInsurance(insuranceId, userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: null,
                    message: 'Insurance deleted successfully'
                }
            };

        } catch (error) {
            context.error('Error deleting insurance:', error);

            if (error.message === 'Insurance not found') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            // Handle validation errors
            if (error.message.includes('Invalid') ||
                error.message.includes('required') ||
                error.message.includes('Cannot delete')) {
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
                    message: 'Failed to delete insurance',
                    data: null
                }
            };
        }
    }

    /**
     * Get insurance statistics
     */
    getInsuranceStats = async (request, context) => {
        try {
            const userId = context.user?._id;

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User authentication required',
                        data: null
                    }
                };
            }

            const stats = await InsuranceService.getInsuranceStats(userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: stats,
                    message: 'Insurance statistics retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting insurance stats:', error);

            // Handle validation errors
            if (error.message.includes('Invalid') || error.message.includes('required')) {
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
                    message: 'Failed to retrieve insurance statistics',
                    data: null
                }
            };
        }
    }
}

module.exports = new InsuranceController();