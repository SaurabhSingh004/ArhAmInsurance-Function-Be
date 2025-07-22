// controllers/claimController.js
const ClaimService = require('../services/ClaimService');

class ClaimController {

    /**
     * Create a new claim with form data and optional document uploads
     */
    createClaim = async (request, context) => {
        try {
            context.log('Request files:', request.files ? Object.keys(request.files) : 'none');
            context.log('Request body:', request.formData ? Object.keys(request.formData) : 'none');
            context.log('Request values:', request.formData ? Object.values(request.formData) : 'none');
            context.log('Request body type:', typeof request.body);

            // Extract data from form data (request.body after multipart processing)
            let userId, email, claimData = {};
            email = request.formData.email;
            // Extract required fields from form data
            userId = context.user?._id;

            // Extract all other claim data fields
            const excludedFields = ['email'];
            for (const [key, value] of Object.entries(request.formData)) {
                if (!excludedFields.includes(key)) {
                    console.log("neww email field", key, value);
                    // Try to parse JSON strings for complex data
                    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                        try {
                            claimData[key] = JSON.parse(value);
                            context.log(`Parsed ${key} as JSON:`, claimData[key]);
                        } catch (parseError) {
                            claimData[key] = value;
                            context.log(`Using ${key} as string:`, value);
                        }
                    } else {
                        claimData[key] = value;
                    }
                }
            }

            context.log('Extracted data:', {
                userId,
                email,
                claimDataKeys: Object.keys(claimData)
            });

            // Validate required fields
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User authentication required or userId must be provided',
                        data: null
                    }
                };
            }

            if (!email) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'email is required',
                        received: { userId, email },
                        availableFields: Object.keys(request.body || {})
                    }
                };
            }

            // Validate specific claim fields
            const { insuranceId, claimType, incidentDate, claimAmount, description } = claimData;
            
            if (!insuranceId || !claimType || !incidentDate || !claimAmount || !description) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Missing required claim fields: insuranceId, claimType, incidentDate, claimAmount, description',
                        received: claimData,
                        data: null
                    }
                };
            }

            // Prepare claim data with claimant information
            const formattedClaimData = {
                insuranceId,
                claimType: claimType.toLowerCase(), // Convert to lowercase to match enum
                claimAmount: parseFloat(claimAmount),
                incidentDate,
                description,
                claimant: {
                    name: context.user?.name || 'Unknown',
                    relationship: 'self', // Default to self
                    contactNumber: context.user?.phone || 'N/A',
                    email: email,
                    address: context.user?.address || 'N/A'
                },
                currency: 'INR', // Default currency
                priority: 'medium' // Default priority
            };

            // Process files if documents are provided
            let files = null;
            if (request.files && Object.keys(request.files).length > 0) {
                // Handle multiple files - check for documents field first, then fallback to any files
                let documents = request.files.documents ||
                    request.files.document ||
                    request.files.file ||
                    Object.values(request.files)[0]; // Get first available file field

                // If no specific field found, use all files
                if (!documents) {
                    documents = Object.values(request.files).flat();
                }

                // Ensure documents is always an array even if only one file was uploaded
                if (!Array.isArray(documents)) {
                    documents = [documents];
                }

                context.log(`Processing ${documents.length} files for claim creation`);

                // Convert documents to expected format for ClaimService
                files = documents.map(doc => ({
                    buffer: doc.buffer || doc.data,
                    filename: doc.originalname || doc.name || doc.filename,
                    contentType: doc.mimetype || doc.contentType || 'application/pdf'
                }));
            }

            // Create claim with optional file upload
            const result = await ClaimService.createClaim(userId, formattedClaimData, files);

            return {
                status: 201,
                jsonBody: {
                    success: true,
                    data: {
                        claim: result.claim,
                        documentsUploaded: result.documentsUploaded,
                        uploadResult: result.uploadResult
                    },
                    message: result.documentsUploaded > 0 
                        ? `Claim created successfully with ${result.documentsUploaded} supporting documents` 
                        : 'Claim created successfully',
                    processedFields: Object.keys(claimData)
                }
            };

        } catch (error) {
            context.error('Error creating claim:', error);

            // Handle all validation and business logic errors as 400
            if (error.message.includes('required fields') || 
                error.message.includes('Insurance policy not found') ||
                error.message.includes('inactive insurance') ||
                error.message.includes('Missing required field') ||
                error.message.includes('Invalid') ||
                error.message.includes('already exists') ||
                error.message.includes('Duplicate value') ||
                error.message.includes('Validation failed') ||
                error.message.includes('must be') ||
                error.message.includes('Cannot create claim') ||
                error.message.includes('All required fields must be provided')) {
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

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'An unexpected error occurred while creating claim',
                    data: null
                }
            };
        }
    }

    /**
     * Upload supporting documents for a claim
     */
    uploadClaimDocuments = async (request, context) => {
        try {
            const { claimId } = request.params || {};
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

            if (!claimId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Claim ID is required',
                        data: null
                    }
                };
            }

            // Extract files from request
            let files = null;
            if (request.files && Object.keys(request.files).length > 0) {
                // Handle multiple files - check for documents field first, then fallback to any files
                let documents = request.files.documents ||
                    request.files.document ||
                    request.files.file ||
                    Object.values(request.files)[0];

                if (!documents) {
                    documents = Object.values(request.files).flat();
                }

                if (!Array.isArray(documents)) {
                    documents = [documents];
                }

                files = documents.map(doc => ({
                    buffer: doc.buffer || doc.data,
                    filename: doc.originalname || doc.name || doc.filename,
                    contentType: doc.mimetype || doc.contentType || 'application/pdf'
                }));
            }

            if (!files || files.length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'No files provided for upload',
                        data: null
                    }
                };
            }

            const result = await ClaimService.uploadClaimDocuments(files, userId, claimId);

            return {
                status: 200,
                jsonBody: result
            };

        } catch (error) {
            context.error('Error uploading claim documents:', error);

            if (error.message.includes('Claim not found') || 
                error.message.includes('insurance policy not found')) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            if (error.message.includes('Unsupported file type') ||
                error.message.includes('exceeds maximum size') ||
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
                    message: 'Failed to upload claim documents',
                    data: null
                }
            };
        }
    }

    /**
     * Get claim by ID
     */
    getClaim = async (request, context) => {
        try {
            const { claimId } = request.params || {};
            const userId = context.user?._id;

            if (!claimId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Claim ID is required',
                        data: null
                    }
                };
            }

            const claim = await ClaimService.getClaimById(claimId, userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: claim,
                    message: 'Claim retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting claim:', error);

            if (error.message === 'Claim not found') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

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
                    message: 'Failed to retrieve claim',
                    data: null
                }
            };
        }
    }

    /**
     * Get all claims for a user
     */
    getUserClaims = async (request, context) => {
        try {
            const userId = context.user?._id;
            const { status, claimType, insuranceId } = request.query || {};

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
            if (claimType) filters.claimType = claimType;
            if (insuranceId) filters.insuranceId = insuranceId;

            const claims = await ClaimService.getUserClaims(userId, filters);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: claims,
                    message: 'Claims retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting user claims:', error);

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
                    message: 'Failed to retrieve claims',
                    data: null
                }
            };
        }
    }

    /**
     * Update claim status
     */
    updateClaimStatus = async (request, context) => {
        try {
            const { claimId } = request.params || {};
            const { status, ...additionalData } = await request.json() || {};
            const userId = context.user?._id;

            if (!claimId || !status) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Claim ID and status are required',
                        data: null
                    }
                };
            }

            const claim = await ClaimService.updateClaimStatus(claimId, status, userId, additionalData);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: claim,
                    message: 'Claim status updated successfully'
                }
            };

        } catch (error) {
            context.error('Error updating claim status:', error);

            if (error.message === 'Claim not found') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            if (error.message.includes('Invalid claim status') ||
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
                    message: 'Failed to update claim status',
                    data: null
                }
            };
        }
    }

    /**
     * Add processing note to claim
     */
    addProcessingNote = async (request, context) => {
        try {
            const { claimId } = request.params || {};
            const { note, stage } = await request.json() || {};
            const userId = context.user?._id;

            if (!claimId || !note) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Claim ID and note are required',
                        data: null
                    }
                };
            }

            const claim = await ClaimService.addProcessingNote(claimId, note, userId, stage);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: claim,
                    message: 'Processing note added successfully'
                }
            };

        } catch (error) {
            context.error('Error adding processing note:', error);

            if (error.message === 'Claim not found') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

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
                    message: 'Failed to add processing note',
                    data: null
                }
            };
        }
    }

    /**
     * Get claims by insurance policy
     */
    getClaimsByInsurance = async (request, context) => {
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

            const claims = await ClaimService.getClaimsByInsurance(insuranceId, userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: claims,
                    message: 'Claims retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting claims by insurance:', error);

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
                    message: 'Failed to retrieve claims',
                    data: null
                }
            };
        }
    }

    /**
     * Get claim statistics
     */
    getClaimStats = async (request, context) => {
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

            const stats = await ClaimService.getClaimStats(userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: stats,
                    message: 'Claim statistics retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting claim stats:', error);

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
                    message: 'Failed to retrieve claim statistics',
                    data: null
                }
            };
        }
    }

    /**
     * Delete claim
     */
    deleteClaim = async (request, context) => {
        try {
            const { claimId } = request.params || {};
            const userId = context.user?._id;

            if (!claimId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Claim ID is required',
                        data: null
                    }
                };
            }

            await ClaimService.deleteClaim(claimId, userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: null,
                    message: 'Claim deleted successfully'
                }
            };

        } catch (error) {
            context.error('Error deleting claim:', error);

            if (error.message === 'Claim not found') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            if (error.message.includes('Cannot delete claim') ||
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
                    message: 'Failed to delete claim',
                    data: null
                }
            };
        }
    }
}

module.exports = new ClaimController();