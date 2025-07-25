// controllers/insuranceController.js
const InsuranceService = require('../services/insuranceService');
const InsuranceQueryService = require('../services/InsuranceQueryService');
const InsuranceComparisonService = require('../services/InsuranceComparerService');
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

            // Handle document validation errors (invalid document type)
            if (error.message.includes('Invalid document type') ||
                error.message.includes('Please upload a valid insurance policy document') ||
                error.message.includes('Invalid document or request')) {
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

            // Handle AI service errors (500 level errors from AI service)
            if (error.message.includes('AI service error: 5')) {
                return {
                    status: 500,
                    jsonBody: {
                        success: false,
                        message: 'Document processing service is temporarily unavailable. Please try again later.',
                        data: null
                    }
                };
            }

            // Handle AI service connection errors
            if (error.message.includes('AI service did not respond') ||
                error.message.includes('AI service request error')) {
                return {
                    status: 503,
                    jsonBody: {
                        success: false,
                        message: 'Document processing service is temporarily unavailable. Please try again later.',
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
     * Initialize insurance document query conversation
     */
    initializeQuery = async (request, context) => {
        try {
            const userId = context.user?._id;
            const { insuranceId, query } = await request.json() || {};

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

            if (!insuranceId || !query) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Insurance ID and query are required',
                        data: null
                    }
                };
            }

            const result = await InsuranceQueryService.initializeInsuranceQuery(userId, insuranceId, query);

            return {
                status: 201,
                jsonBody: result
            };

        } catch (error) {
            context.error('Error initializing insurance query:', error);

            if (error.message.includes('not found') || 
                error.message.includes('No document found')) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            if (error.message.includes('AI service') ||
                error.message.includes('Invalid') ||
                error.message.includes('required')) {
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
                    message: 'Failed to initialize insurance query',
                    data: null
                }
            };
        }
    }

    /**
     * Query insurance document
     */
    queryDocument = async (request, context) => {
        try {
            const userId = context.user?._id;
            const { chatId, query } = await request.json() || {};

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

            if (!chatId || !query) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Chat ID and query are required',
                        data: null
                    }
                };
            }
            const stringQuery = String(query);
            const result = await InsuranceQueryService.queryInsuranceDocument(userId, chatId, stringQuery);

            return {
                status: 200,
                jsonBody: result
            };

        } catch (error) {
            context.error('Error querying insurance document:', error);

            if (error.message.includes('not found') ||
                error.message.includes('not yet processed')) {
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
                error.message.includes('WebSocket')) {
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
                    message: 'Failed to process query',
                    data: null
                }
            };
        }
    }

    /**
     * Get conversation history
     */
    getConversationHistory = async (request, context) => {
        try {
            const userId = context.user?._id;
            const { chatId } = request.params || {};

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

            const conversations = await InsuranceQueryService.getConversationHistory(userId, chatId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: conversations,
                    message: 'Conversation history retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting conversation history:', error);

            if (error.message.includes('not found')) {
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
                    message: 'Failed to retrieve conversation history',
                    data: null
                }
            };
        }
    }

    /**
     * Get user conversations (summary)
     */
    getUserConversations = async (request, context) => {
        try {
            const userId = context.user?._id;
            const { limit } = request.query || {};

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

            const conversations = await InsuranceQueryService.getUserConversations(userId, limit ? parseInt(limit) : undefined);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: conversations,
                    message: 'User conversations retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting user conversations:', error);

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to retrieve conversations',
                    data: null
                }
            };
        }
    }

    /**
     * Delete conversation
     */
    deleteConversation = async (request, context) => {
        try {
            const userId = context.user?._id;
            const { chatId } = request.params || {};

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

            if (!chatId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Chat ID is required',
                        data: null
                    }
                };
            }

            await InsuranceQueryService.deleteConversation(userId, chatId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: null,
                    message: 'Conversation deleted successfully'
                }
            };

        } catch (error) {
            context.error('Error deleting conversation:', error);

            if (error.message.includes('not found')) {
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
                    message: 'Failed to delete conversation',
                    data: null
                }
            };
        }
    }

    /**
     * Get conversation statistics
     */
    getConversationStats = async (request, context) => {
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

            const stats = await InsuranceQueryService.getConversationStats(userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: stats,
                    message: 'Conversation statistics retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting conversation stats:', error);

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to retrieve conversation statistics',
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

            const formattedData = await InsuranceService.getFormattedUserInsurances(userId, filters);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Insurance policies retrieved successfully',
                    data: formattedData
                }
            };

        } catch (error) {
            context.error('Error getting user insurances:', error);

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

    compareDocuments = async (request, context) => {
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

            // Extract files from request
            let files = null;
            if (request.files && Object.keys(request.files).length > 0) {
                context.log('Available file fields:', Object.keys(request.files));
                
                let documents = [];
                
                // Check for specific field names first
                if (request.files.files) {
                    documents = Array.isArray(request.files.files) ? request.files.files : [request.files.files];
                } else if (request.files.documents) {
                    documents = Array.isArray(request.files.documents) ? request.files.documents : [request.files.documents];
                } else {
                    // Handle file1, file2, file3, etc. pattern
                    const fileKeys = Object.keys(request.files).sort();
                    for (const key of fileKeys) {
                        const file = request.files[key];
                        if (Array.isArray(file)) {
                            documents.push(...file);
                        } else {
                            documents.push(file);
                        }
                    }
                }

                // If still no documents found, use all files
                if (documents.length === 0) {
                    documents = Object.values(request.files).flat();
                }

                context.log(`Processing ${documents.length} files for comparison`);

                // Convert documents to expected format
                files = documents.map((doc, index) => ({
                    buffer: doc.buffer || doc.data,
                    filename: doc.originalname || doc.name || doc.filename || `document_${index + 1}.pdf`,
                    contentType: doc.mimetype || doc.contentType || 'application/pdf'
                }));
            }

            if (!files || files.length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'No files provided for comparison',
                        data: null
                    }
                };
            }

            if (files.length < 2) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'At least 2 documents are required for comparison',
                        data: null
                    }
                };
            }

            // Get comparison metric from request body or default to 'compare'
            const comparisonMetric = request.query?.comparisonMetric || 'compare';

            const result = await InsuranceComparisonService.compareInsuranceDocuments(
                files, 
                userId, 
                comparisonMetric
            );

            return {
                status: 200,
                jsonBody: result
            };

        } catch (error) {
            context.error('Error comparing insurance documents:', error);

            // Handle specific error types
            if (error.message.includes('At least 2') || 
                error.message.includes('Maximum') ||
                error.message.includes('required for comparison') ||
                error.message.includes('No files provided') ||
                error.message.includes('Unsupported file type') ||
                error.message.includes('exceeds maximum size')) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            if (error.message.includes('Something went wrong') ||
                error.message.includes('Comparison service') ||
                error.message.includes('did not respond')) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Something went wrong during document comparison',
                        data: null
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to compare insurance documents',
                    data: null
                }
            };
        }
    }
}

module.exports = new InsuranceController();