// services/InsuranceService.js
const Insurance = require('../models/insurance');
const UploadService = require('./UploadService');
const WebSocketService = require('./websocketService');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { logError } = require('../utils/logError');

class InsuranceService {
    constructor() {
        this.uploadService = new UploadService();
        this.docInsightsUrl = 'https://doc-insights.happyriver-1999a58f.southindia.azurecontainerapps.io/upload';
        this.apiKey = 'FTARhQyFxwx4efXbKQe8oa8FQ4OVhm3itTGVJLW1QPxxwL5LP5i7jOI1dK5JGaPeLYZrVRo92yM5XDcPHsfEeZCCXP36uxltrIeHZ58Ux8orG1bAOdiFcf1N8QS23EEM';
    }

    /**
     * Upload and process insurance document
     * @param {Buffer} fileBuffer - File buffer
     * @param {string} filename - Original filename
     * @param {string} contentType - File content type
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Insurance creation result
     */
    async uploadInsuranceDocument(fileBuffer, filename, contentType, userId) {
        let chatId = null;
        let uploadedFile = null;

        try {
            // Generate unique chat ID for this session
            chatId = uuidv4();

            // Step 1: Validate file
            console.log('Step 1: Validating insurance document');
            console.log("fileBuffer, ", fileBuffer);
            this.uploadService.validateRawFile(fileBuffer, filename, contentType, {
                allowedTypes: [
                    'application/pdf',
                    'image/jpeg',
                    'image/jpg', 
                    'image/png',
                    'image/tiff',
                    'image/bmp'
                ],
                maxFileSize: 15 * 1024 * 1024, // 15MB for insurance docs
                requiredKeywords: [] // No specific keywords required for Arham Insurance
            });

            // Step 2: Upload document to Azure Blob Storage
            console.log('Step 2: Uploading document to Azure Blob Storage');
            const folderPath = `arham-insurance-documents/${userId}`;
            
            uploadedFile = await this.uploadService.uploadRawFile(
                fileBuffer,
                filename,
                contentType,
                userId,
                folderPath,
                {
                    documentType: 'insurance-policy',
                    uploadedBy: 'user',
                    company: 'Arham Insurance Brokers',
                    companyCode: 'AIBL'
                }
            );
            
            if (!uploadedFile || !uploadedFile.url) {
                throw new Error('Failed to upload document to Azure storage');
            }

            console.log('Document uploaded to Azure:', uploadedFile.blobName);

            // Step 3: Send document to AI service
            console.log('Step 3: Sending document to AI service');
            const aiResponse = await this.sendDocumentToAI(userId, chatId, fileBuffer, filename);

            if (!aiResponse || aiResponse.status !== 'upload' || aiResponse.vector !== 'processed') {
                throw new Error('AI service failed to process document properly');
            }

            console.log('Document processed by AI service successfully');

            // Step 4: Check if insurance is active
            console.log('Step 4: Checking insurance policy status');
            const activeCheck = await WebSocketService.checkInsuranceActive(userId, chatId);

            if (!activeCheck.isActive) {
                throw new Error(`Insurance policy is not active: ${activeCheck.response}`);
            }

            console.log('Insurance policy is active');

            // Step 5: Get structured insurance data
            console.log('Step 5: Getting structured insurance data');
            const structuredData = await WebSocketService.getStructuredInsuranceData(userId, chatId);

            // Step 6: Create insurance record in database
            console.log('Step 6: Creating insurance record in database');
            const insuranceRecord = await this.createInsuranceRecord(
                userId, 
                structuredData.insuranceData, 
                uploadedFile,
                chatId
            );

            return {
                success: true,
                data: insuranceRecord,
                message: 'Insurance document uploaded and processed successfully'
            };

        } catch (error) {
            console.error('Error in uploadInsuranceDocument:', error);

            // Cleanup on error
            if (uploadedFile && uploadedFile.blobName) {
                try {
                    await this.uploadService.deleteFile(uploadedFile.blobName);
                    console.log('Cleaned up uploaded file due to error');
                } catch (cleanupError) {
                    console.error('Failed to cleanup file:', cleanupError);
                }
            }

            // Close WebSocket connection if exists
            if (chatId) {
                WebSocketService.closeConnection(userId, chatId);
            }

            throw logError('uploadInsuranceDocument', error, { userId });
        }
    }

    /**
     * Upload supporting documents for claims
     * @param {Array} files - Array of file objects [{buffer, filename, contentType}]
     * @param {string} userId - User ID
     * @param {string} policyId - Policy ID
     * @returns {Promise<Array>} Uploaded files array
     */
    async uploadClaimDocuments(files, userId, policyId) {
        try {
            const uploadedFiles = [];
            const folderPath = `arham-claim-documents/${userId}/${policyId}`;

            for (const file of files) {
                // Validate claim document requirements
                this.uploadService.validateRawFile(file.buffer, file.filename, file.contentType, {
                    allowedTypes: [
                        'application/pdf',
                        'image/jpeg',
                        'image/jpg',
                        'image/png',
                        'image/tiff',
                        'image/bmp',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    ],
                    maxFileSize: 10 * 1024 * 1024, // 10MB for claim docs
                });

                // Upload with claim-specific metadata
                const uploadedFile = await this.uploadService.uploadRawFile(
                    file.buffer,
                    file.filename,
                    file.contentType,
                    userId,
                    folderPath,
                    {
                        documentType: 'claim-supporting',
                        policyId: policyId,
                        uploadedBy: 'user',
                        company: 'Arham Insurance Brokers',
                        companyCode: 'AIBL'
                    }
                );

                uploadedFiles.push(uploadedFile);
            }

            return uploadedFiles;
        } catch (error) {
            throw logError('uploadClaimDocuments', error, { userId, policyId });
        }
    }

    /**
     * Send document to AI service for processing
     * @param {string} userId - User ID
     * @param {string} chatId - Chat ID
     * @param {Buffer} fileContent - File content buffer
     * @param {string} fileName - Original file name
     * @returns {Promise<Object>} AI service response
     */
    async sendDocumentToAI(userId, chatId, fileContent, fileName) {
        try {
            const FormData = require('form-data');
            const formData = new FormData();

            formData.append('user_id', userId);
            formData.append('chat_id', chatId);
            formData.append('file', fileContent, {
                filename: fileName,
                contentType: 'application/pdf'
            });

            const response = await axios.post(this.docInsightsUrl, formData, {
                headers: {
                    'accept': 'application/json',
                    'x-api-key': this.apiKey,
                    ...formData.getHeaders()
                },
                timeout: 60000 // 60 seconds timeout
            });

            return response.data;
        } catch (error) {
            if (error.response) {
                console.error('AI service error response:', error.response.data);
                throw new Error(`AI service error: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.request) {
                throw new Error('AI service did not respond');
            } else {
                throw new Error(`AI service request error: ${error.message}`);
            }
        }
    }

    /**
     * Create insurance record in database
     * @param {string} userId - User ID
     * @param {Object} insuranceData - Structured insurance data
     * @param {Object} uploadedFile - Uploaded file info
     * @param {string} chatId - Chat ID
     * @returns {Promise<Object>} Created insurance record
     */
    async createInsuranceRecord(userId, insuranceData, uploadedFile, chatId) {
        try {
            // Validate required insurance data
            if (!insuranceData || typeof insuranceData !== 'object') {
                throw new Error('Insurance data is required and must be a valid object');
            }

            // Validate required fields
            const requiredFields = ['policyId', 'policyNumber', 'status', 'productName', 'coveragePeriod', 'beneficiary', 'coverage'];
            for (const field of requiredFields) {
                if (!insuranceData[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Validate coverage period
            if (!insuranceData.coveragePeriod.startDate || !insuranceData.coveragePeriod.endDate) {
                throw new Error('Coverage period must include both start and end dates');
            }

            // Validate beneficiary data
            const requiredBeneficiaryFields = ['name', 'email', 'birthDate', 'documentNumber', 'residenceCountry'];
            for (const field of requiredBeneficiaryFields) {
                if (!insuranceData.beneficiary[field]) {
                    throw new Error(`Missing required beneficiary field: ${field}`);
                }
            }

            // Validate dates
            let startDate, endDate, birthDate;
            try {
                startDate = new Date(insuranceData.coveragePeriod.startDate);
                endDate = new Date(insuranceData.coveragePeriod.endDate);
                birthDate = new Date(insuranceData.beneficiary.birthDate);
                
                if (isNaN(startDate.getTime())) {
                    throw new Error('Invalid coverage start date format');
                }
                if (isNaN(endDate.getTime())) {
                    throw new Error('Invalid coverage end date format');
                }
                if (isNaN(birthDate.getTime())) {
                    throw new Error('Invalid beneficiary birth date format');
                }
                
                if (startDate >= endDate) {
                    throw new Error('Coverage start date must be before end date');
                }
            } catch (dateError) {
                throw new Error(`Date validation error: ${dateError.message}`);
            }

            // Validate status
            const validStatuses = ['active', 'expired', 'cancelled'];
            if (!validStatuses.includes(insuranceData.status)) {
                throw new Error(`Invalid insurance status. Must be one of: ${validStatuses.join(', ')}`);
            }

            // Validate duration
            let duration;
            try {
                duration = Number(insuranceData.duration);
                if (isNaN(duration) || duration <= 0) {
                    throw new Error('Duration must be a positive number');
                }
            } catch (durationError) {
                throw new Error('Invalid duration format');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(insuranceData.beneficiary.email)) {
                throw new Error('Invalid beneficiary email format');
            }

            // Prepare insurance document data
            const insuranceDoc = {
                userId,
                policyId: insuranceData.policyId.toString().trim(),
                policyNumber: insuranceData.policyNumber.toString().trim(),
                status: insuranceData.status,
                productName: insuranceData.productName.toString().trim(),
                coveragePeriod: {
                    startDate: startDate,
                    endDate: endDate
                },
                beneficiary: {
                    name: insuranceData.beneficiary.name.toString().trim(),
                    email: insuranceData.beneficiary.email.toString().toLowerCase().trim(),
                    birthDate: birthDate,
                    documentNumber: insuranceData.beneficiary.documentNumber.toString().trim(),
                    residenceCountry: insuranceData.beneficiary.residenceCountry.toString().trim()
                },
                duration: duration,
                coverage: insuranceData.coverage.toString().trim(),
                docUrl: uploadedFile.url,
                chatId,
                azureBlobName: uploadedFile.blobName,
                processingStatus: 'completed'
            };

            // Add cancel date if present
            if (insuranceData.cancelDate) {
                try {
                    const cancelDate = new Date(insuranceData.cancelDate);
                    if (isNaN(cancelDate.getTime())) {
                        throw new Error('Invalid cancellation date format');
                    }
                    insuranceDoc.cancelDate = cancelDate;
                } catch (cancelError) {
                    throw new Error(`Cancellation date error: ${cancelError.message}`);
                }
            }

            // Create insurance record
            const insurance = new Insurance(insuranceDoc);
            await insurance.save();

            console.log('Insurance record created with ID:', insurance._id);

            return insurance;

        } catch (error) {
            // Handle MongoDB duplicate key errors
            if (error.code === 11000) {
                if (error.keyPattern && error.keyPattern.policyId) {
                    throw new Error(`Insurance policy with ID '${insuranceData?.policyId}' already exists`);
                }
                if (error.keyPattern && error.keyPattern.policyNumber) {
                    throw new Error(`Insurance policy with number '${insuranceData?.policyNumber}' already exists`);
                }
                // Generic duplicate key error
                const duplicateField = Object.keys(error.keyPattern || {})[0] || 'unknown field';
                throw new Error(`Duplicate value for ${duplicateField}`);
            }

            // Handle MongoDB validation errors
            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map(err => err.message);
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Handle MongoDB cast errors
            if (error.name === 'CastError') {
                throw new Error(`Invalid data type for field '${error.path}': ${error.message}`);
            }

            // Handle connection errors
            if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
                throw new Error('Database connection error. Please try again later');
            }

            // Handle any other MongoDB errors
            if (error.name && error.name.startsWith('Mongo')) {
                throw new Error('Database operation failed. Please check your data and try again');
            }

            // If it's already our custom error, re-throw it
            if (error.message.includes('Missing required field') || 
                error.message.includes('Invalid') || 
                error.message.includes('must be') ||
                error.message.includes('already exists')) {
                throw error;
            }

            // Log unexpected errors but don't expose internal details
            console.error('Unexpected error in createInsuranceRecord:', error);
            throw new Error('Failed to create insurance record. Please verify your data and try again');
        }
    }

    /**
     * Get insurance by ID
     * @param {string} insuranceId - Insurance ID
     * @param {string} userId - User ID (optional, for authorization)
     * @returns {Promise<Object>} Insurance record
     */
    async getInsuranceById(insuranceId, userId = null) {
        try {
            const query = { _id: insuranceId };
            if (userId) query.userId = userId;

            const insurance = await Insurance.findOne(query);
            
            if (!insurance) {
                throw new Error('Insurance not found');
            }

            return insurance;
        } catch (error) {
            throw logError('getInsuranceById', error, { insuranceId, userId });
        }
    }

    /**
     * Get all insurances for a user
     * @param {string} userId - User ID
     * @param {Object} filters - Optional filters
     * @returns {Promise<Array>} Array of insurance records
     */
    async getUserInsurances(userId, filters = {}) {
        try {
            const query = { userId, ...filters };
            
            const insurances = await Insurance.find(query)
                .sort({ createdAt: -1 })
                .lean();

            return insurances;
        } catch (error) {
            throw logError('getUserInsurances', error, { userId });
        }
    }

    async getFormattedUserInsurances(userId, filters = {}) {
        try {
            const query = { userId, ...filters };
            
            const insurances = await Insurance.find(query)
                .sort({ createdAt: -1 })
                .lean();

            // Get user email from first insurance record (assuming it's consistent)
            const userEmail = insurances.length > 0 ? insurances[0].beneficiary.email : '';

            // Count active policies
            const activePolicies = insurances.filter(insurance => insurance.status === 'active').length;

            // Format policies
            const formattedPolicies = insurances.map(insurance => {
                const formattedPolicy = {
                    policyId: insurance.policyId,
                    policyNumber: insurance.policyNumber,
                    status: insurance.status,
                    productName: insurance.productName,
                    coveragePeriod: {
                        startDate: insurance.coveragePeriod.startDate.toISOString().split('T')[0],
                        endDate: insurance.coveragePeriod.endDate.toISOString().split('T')[0]
                    },
                    beneficiary: {
                        name: insurance.beneficiary.name,
                        email: insurance.beneficiary.email,
                        birthDate: insurance.beneficiary.birthDate.toISOString().split('T')[0],
                        documentNumber: insurance.beneficiary.documentNumber,
                        residenceCountry: insurance.beneficiary.residenceCountry
                    },
                    duration: insurance.duration,
                    coverage: insurance.coverage,
                    docUrl: insurance.docUrl,
                    createdAt: insurance.createdAt.toISOString().split('T')[0]
                };

                // Add cancelDate if present
                if (insurance.cancelDate) {
                    formattedPolicy.cancelDate = insurance.cancelDate.toISOString().split('T')[0];
                }

                return formattedPolicy;
            });

            return {
                email: userEmail,
                activePolicies: activePolicies,
                policies: formattedPolicies
            };

        } catch (error) {
            throw logError('getFormattedUserInsurances', error, { userId });
        }
    }

    /**
     * Update insurance status
     * @param {string} insuranceId - Insurance ID
     * @param {string} status - New status
     * @param {string} userId - User ID (for authorization)
     * @returns {Promise<Object>} Updated insurance record
     */
    async updateInsuranceStatus(insuranceId, status, userId) {
        try {
            const validStatuses = ['active', 'expired', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status. Must be active, expired, or cancelled');
            }

            const insurance = await Insurance.findOneAndUpdate(
                { _id: insuranceId, userId },
                { 
                    status,
                    ...(status === 'cancelled' && !insurance?.cancelDate ? { cancelDate: new Date() } : {})
                },
                { new: true }
            );

            if (!insurance) {
                throw new Error('Insurance not found');
            }

            return insurance;
        } catch (error) {
            throw logError('updateInsuranceStatus', error, { insuranceId, status, userId });
        }
    }

    /**
     * Delete insurance record
     * @param {string} insuranceId - Insurance ID
     * @param {string} userId - User ID (for authorization)
     * @returns {Promise<boolean>} Deletion success
     */
    async deleteInsurance(insuranceId, userId) {
        try {
            const insurance = await Insurance.findOne({ _id: insuranceId, userId });
            
            if (!insurance) {
                throw new Error('Insurance not found');
            }

            // Delete file from Azure storage
            if (insurance.azureBlobName) {
                try {
                    await this.uploadService.deleteFile(insurance.azureBlobName);
                    console.log('Deleted file from Azure storage:', insurance.azureBlobName);
                } catch (fileError) {
                    console.error('Failed to delete file from storage:', fileError);
                    // Continue with database deletion even if file deletion fails
                }
            }

            // Delete from database
            await Insurance.deleteOne({ _id: insuranceId, userId });

            return true;
        } catch (error) {
            throw logError('deleteInsurance', error, { insuranceId, userId });
        }
    }

    /**
     * Get insurance statistics for user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Insurance statistics
     */
    async getInsuranceStats(userId) {
        try {
            const stats = await Insurance.aggregate([
                { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
                {
                    $group: {
                        _id: null,
                        totalPolicies: { $sum: 1 },
                        activePolicies: {
                            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                        },
                        expiredPolicies: {
                            $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
                        },
                        cancelledPolicies: {
                            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                        }
                    }
                }
            ]);

            return stats[0] || {
                totalPolicies: 0,
                activePolicies: 0,
                expiredPolicies: 0,
                cancelledPolicies: 0
            };
        } catch (error) {
            throw logError('getInsuranceStats', error, { userId });
        }
    }
}

module.exports = new InsuranceService();