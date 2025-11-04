// services/InsuranceService.js
const Document = require('../models/insurance');
const UploadService = require('./UploadService');
const WebSocketService = require('./websocketService');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { logError } = require('../utils/logError');
const mongoose = require('mongoose');
const { getInsurancesByType, getAllInsuranceTypes } = require('../utils/insuranceData');

class InsuranceService {
    constructor() {
        this.uploadService = new UploadService();
        this.docInsightsUrl = 'https://doc-insights.happyriver-1999a58f.southindia.azurecontainerapps.io/upload';
        this.apiKey = 'FTARhQyFxwx4efXbKQe8oa8FQ4OVhm3itTGVJLW1QPxxwL5LP5i7jOI1dK5JGaPeLYZrVRo92yM5XDcPHsfEeZCCXP36uxltrIeHZ58Ux8orG1bAOdiFcf1N8QS23EEM';
    }

    /**
     * Upload and process ANY document (kept name for backward compatibility).
     * If the documentType is 'insurance_policy', we also run insurance validations.
     *
     * @param {Buffer} fileBuffer
     * @param {string} filename
     * @param {string} contentType
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async uploadInsuranceDocument(fileBuffer, filename, contentType, userId) {
        let chatId = null;
        let uploadedFile = null;

        try {
            // Step 0: Generate a session chatId
            chatId = uuidv4();

            // Step 1: Validate file (generic)
            console.log('Step 1: Validating document');
            this.uploadService.validateRawFile(fileBuffer, filename, contentType, {
                allowedTypes: [
                    'application/pdf',
                    'image/jpeg',
                    'image/jpg',
                    'image/png',
                    'image/tiff',
                    'image/bmp'
                ],
                maxFileSize: 15 * 1024 * 1024,
                requiredKeywords: []
            });

            // Step 2: Upload to Azure Blob Storage
            console.log('Step 2: Uploading document to Azure Blob Storage');
            const folderPath = `arham-documents/${userId}`;

            uploadedFile = await this.uploadService.uploadRawFile(
                fileBuffer,
                filename,
                contentType,
                userId,
                folderPath,
                {
                    // metadata hints only; the real documentType will come from AI
                    documentType: 'unknown',
                    uploadedBy: 'user',
                    company: 'Arham Insurance Brokers',
                    companyCode: 'AIBL'
                }
            );

            if (!uploadedFile || !uploadedFile.url) {
                throw new Error('Failed to upload document to Azure storage');
            }

            console.log('Document uploaded to Azure:', uploadedFile.blobName);

            // Step 3: Send document to AI service (to vectorize/process)
            console.log('Step 3: Sending document to AI service');
            const aiResponse = await this.sendDocumentToAI(userId, chatId, fileBuffer, filename);

            if (!aiResponse || aiResponse.status !== 'upload' || aiResponse.vector !== 'processed') {
                throw new Error('AI service failed to process document properly');
            }

            console.log('Document processed by AI service successfully');

            // Step 4: (Optional) Only for insurance policies, check active status via WebSocket pipeline
            console.log('Step 4: Getting structured document data from AI');
            const structuredData = await WebSocketService.getStructuredInsuranceData(userId, chatId);
            // Expecting shape from your updated getStructuredInsuranceData1:
            // { documentPayload, structuredResponse, fullResponse }
            const documentPayload = structuredData?.documentPayload || structuredData?.insuranceData || structuredData;

            if (!documentPayload || typeof documentPayload !== 'object') {
                throw new Error('Invalid structured payload from AI');
            }

            // If the AI decided this is an insurance policy, optionally check active status
            if (documentPayload.documentType === 'insurance_policy') {
                console.log('Step 4b: Checking insurance policy status');
                const activeCheck = await WebSocketService.checkInsuranceActive(userId, chatId);

                if (!activeCheck.isActive) {
                    throw new Error(`Insurance policy is not active: ${activeCheck.response}`);
                }

                console.log('Insurance policy is active');
            }

            // Step 5: Create a generic Document record (with normalized insurance fields if applicable)
            console.log('Step 5: Creating document record in database');
            const docRecord = await this.createDocumentRecord(
                userId,
                documentPayload,
                uploadedFile,
                chatId
            );

            return {
                success: true,
                data: docRecord,
                message: 'Document uploaded and processed successfully'
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
     * (No DB write here—just upload; you may choose to persist these as 'ticket_travel'/'insurance_claim' types later)
     */
    async uploadClaimDocuments(files, userId, policyId) {
        try {
            const uploadedFiles = [];
            const folderPath = `arham-claim-documents/${userId}/${policyId}`;

            for (const file of files) {
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
                    maxFileSize: 10 * 1024 * 1024
                });

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
     */
    async sendDocumentToAI(userId, chatId, fileContent, fileName) {
        try {
            const FormData = require('form-data');
            const formData = new FormData();

            formData.append('user_id', userId);
            formData.append('chat_id', chatId);
            formData.append('file', fileContent, {
                filename: fileName,
                contentType: 'application/pdf' // you can improve: detect from input contentType
            });

            const response = await axios.post(this.docInsightsUrl, formData, {
                headers: {
                    accept: 'application/json',
                    'x-api-key': this.apiKey,
                    ...formData.getHeaders()
                },
                timeout: 60000
            });

            return response.data;
        } catch (error) {
            if (error.response) {
                console.error('AI service error response:', error.response.data);

                if (this.isInvalidDocumentError(error.response)) {
                    throw new Error('Invalid document type. Please upload a valid document.');
                }

                if (error.response.status >= 400 && error.response.status < 500) {
                    const errorMessage = this.extractErrorMessage(error.response.data);
                    throw new Error(errorMessage || 'Invalid document or request. Please check your file and try again.');
                }

                throw new Error(`AI service error: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.request) {
                throw new Error('AI service did not respond');
            } else {
                throw new Error(`AI service request error: ${error.message}`);
            }
        }
    }

    isInvalidDocumentError(errorResponse) {
        if (!errorResponse || !errorResponse.data) return false;

        const errorData =
            typeof errorResponse.data === 'string'
                ? errorResponse.data.toLowerCase()
                : JSON.stringify(errorResponse.data).toLowerCase();

        const invalidDocumentPatterns = [
            'not an insurance',
            'invalid insurance',
            'not insurance document',
            'document type not supported',
            'unable to extract insurance',
            'no insurance data found',
            'invalid policy document',
            'not a valid insurance policy',
            'document does not contain insurance',
            'failed to identify insurance',
            'unrecognized document format',
            'document format not supported for insurance'
        ];

        return invalidDocumentPatterns.some((pattern) => errorData.includes(pattern));
    }

    extractErrorMessage(errorData) {
        try {
            if (typeof errorData === 'string') {
                return errorData;
            }
            if (errorData && typeof errorData === 'object') {
                return (
                    errorData.message ||
                    errorData.error ||
                    errorData.detail ||
                    errorData.description ||
                    null
                );
            }
        } catch (e) {
            console.error('Error extracting error message:', e);
        }
        return null;
    }

    /**
     * Create a generic Document record using the AI's structured payload.
     * If it's an insurance policy, we also validate normalized fields.
     *
     * @param {string} userId
     * @param {Object} documentPayload  // from getStructuredInsuranceData1 (updated)
     * @param {Object} uploadedFile
     * @param {string} chatId
     * @returns {Promise<Object>}
     */
    async createDocumentRecord(userId, documentPayload, uploadedFile, chatId) {
        try {
            // Basic presence check
            if (!documentPayload || typeof documentPayload !== 'object') {
                throw new Error('Structured document payload is required');
            }

            // Pull out standardized fields
            const {
                documentType = 'other',
                insuranceCategory = null,
                extractedData = {},
                policyId = documentPayload?.policyId, // tolerate older shape
                policyNumber = documentPayload?.policyNumber,
                status = documentPayload?.status,
                productName = documentPayload?.productName,
                coveragePeriod = documentPayload?.coveragePeriod,
                beneficiary = documentPayload?.beneficiary,
                duration = documentPayload?.duration,
                coverage = documentPayload?.coverage,
                cancelDate = documentPayload?.cancelDate,
                premium = documentPayload?.premium,
                currency = documentPayload?.currency,
                insurer = documentPayload?.insurer,
            } = documentPayload;

            // Or newer nested shape:
            const normalized = documentPayload?.normalized || {};
            const normPolicyId = normalized?.policyId ?? policyId ?? null;
            const normPolicyNumber = normalized?.policyNumber ?? policyNumber ?? null;
            const normStatus = normalized?.status ?? status ?? 'unknown';
            const normProductName = normalized?.productName ?? productName ?? null;
            const normCoveragePeriod = normalized?.coveragePeriod ?? coveragePeriod ?? {};
            const normBeneficiary = normalized?.beneficiary ?? beneficiary ?? {};
            const normDuration = normalized?.duration ?? duration ?? null;
            const normCoverage = normalized?.coverage ?? coverage ?? null;
            const normCancelDate = normalized?.cancelDate ?? cancelDate ?? null;
            const normPremium = normalized?.premium ?? premium ?? null;
            const normCurrency = normalized?.currency ?? currency ?? null;
            const normInsurer = normalized?.insurer ?? insurer ?? null;

            // For insurance policies, run stricter validation (as your previous logic)
            if (documentType === 'insurance_policy') {
                // Required fields for insurance
                // helper
                const isBlank = (v) =>
                    v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

                // --- require at least one of policyId / policyNumber ---
                if (isBlank(normPolicyId) && isBlank(normPolicyNumber)) {
                    throw new Error('Missing required field: either policyId or policyNumber must be provided');
                }

                // --- the rest remain required ---
                const requiredFields = [
                    'status',
                    'productName',
                    'coveragePeriod',
                    'beneficiary',
                    'coverage'
                ];

                const requiredMap = {
                    status: normStatus,
                    productName: normProductName,
                    coveragePeriod: normCoveragePeriod,
                    beneficiary: normBeneficiary,
                    coverage: normCoverage
                };

                for (const field of requiredFields) {
                    const val = requiredMap[field];
                    if (
                        val === undefined ||
                        val === null ||
                        (typeof val === 'string' && val.trim() === '')
                    ) {
                        throw new Error(`Missing required field: ${field}`);
                    }
                }


                // Coverage period dates
                if (!normCoveragePeriod.startDate || !normCoveragePeriod.endDate) {
                    throw new Error('Coverage period must include both start and end dates');
                }

                // Parse dates
                const startDate = new Date(normCoveragePeriod.startDate);
                const endDate = new Date(normCoveragePeriod.endDate);
                const birthDate = normBeneficiary?.birthDate ? new Date(normBeneficiary.birthDate) : null;

                if (isNaN(startDate.getTime())) throw new Error('Invalid coverage start date format');
                if (isNaN(endDate.getTime())) throw new Error('Invalid coverage end date format');
                if (startDate >= endDate) throw new Error('Coverage start date must be before end date');
                if (birthDate && isNaN(birthDate.getTime())) throw new Error('Invalid beneficiary birth date format');

                // Status
                const validStatuses = ['active', 'expired', 'cancelled', 'unknown'];
                if (!validStatuses.includes(normStatus)) {
                    throw new Error(`Invalid insurance status. Must be one of: ${validStatuses.join(', ')}`);
                }

                // Duration
                let finalDuration = null;
                if (typeof normDuration === 'number') {
                    if (normDuration <= 0) throw new Error('Duration must be a positive number');
                    finalDuration = normDuration;
                } else if (typeof normDuration === 'string') {
                    const m = normDuration.match(/(\d+)/);
                    finalDuration = m ? parseInt(m[1], 10) : null;
                }

                // Build record
                const toSave = {
                    userId,
                    chatId,
                    documentType: 'insurance_policy',
                    insuranceCategory: documentPayload.insuranceCategory ?? insuranceCategory ?? null,
                    docUrl: uploadedFile.url,
                    azureBlobName: uploadedFile.blobName,
                    processingStatus: 'completed',
                    extractedAt: new Date(),
                    extractedData: extractedData || {},

                    policyId: normPolicyId?.toString().trim(),
                    policyNumber: normPolicyNumber?.toString().trim(),
                    status: normStatus,
                    productName: normProductName?.toString().trim(),
                    coveragePeriod: {
                        startDate,
                        endDate
                    },
                    beneficiary: {
                        name: normBeneficiary?.name ?? null,
                        email: normBeneficiary?.email ? normBeneficiary.email.toLowerCase().trim() : null,
                        birthDate: birthDate || undefined,
                        documentNumber: normBeneficiary?.documentNumber ?? null,
                        residenceCountry: normBeneficiary?.residenceCountry ?? null
                    },
                    duration: finalDuration,
                    coverage: normCoverage ? normCoverage.toString().trim() : null,
                    cancelDate: normCancelDate ? new Date(normCancelDate) : undefined,
                    premium: typeof normPremium === 'number' ? normPremium : null,
                    currency: normCurrency ?? 'INR',
                    insurer: normInsurer ?? 'Arham Insurance Brokers Private Limited'
                };

                const doc = new Document(toSave);
                await doc.save();
                console.log('Document (insurance_policy) created with ID:', doc._id);
                return doc;
            }

            // For NON-insurance docs: save what we know, keep normalized fields mostly null/sparse
            const genericToSave = {
                userId,
                chatId,
                documentType,
                insuranceCategory: documentPayload.insuranceCategory ?? insuranceCategory ?? null,
                docUrl: uploadedFile.url,
                azureBlobName: uploadedFile.blobName,
                processingStatus: 'completed',
                extractedAt: new Date(),
                extractedData: extractedData || {},

                // Keep normalized insurance fields null/undefined for other doc types
                policyId: null,
                policyNumber: null,
                status: 'unknown',
                productName: null,
                coveragePeriod: {},
                beneficiary: {},
                duration: null,
                coverage: null,
                cancelDate: undefined,
                premium: null,
                currency: null,
                insurer: null
            };

            const genericDoc = new Document(genericToSave);
            await genericDoc.save();
            console.log(`Document (${documentType}) created with ID:`, genericDoc._id);
            return genericDoc;
        } catch (error) {
            console.log('new error: ', error);

            if (error.code === 11000) {
                // Handle unique index on (userId, policyId) sparse
                if (error.keyPattern && error.keyPattern.userId && error.keyPattern.policyId) {
                    throw new Error(
                        `You already have a document with policyId '${documentPayload?.normalized?.policyId || documentPayload?.policyId}'.`
                    );
                }
                const duplicateField = Object.keys(error.keyPattern || {})[0] || 'unknown field';
                throw new Error(`Duplicate value for ${duplicateField}`);
            }

            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map((err) => err.message);
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            if (error.name === 'CastError') {
                throw new Error(`Invalid data type for field '${error.path}': ${error.message}`);
            }

            if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
                throw new Error('Database connection error. Please try again later');
            }

            if (error.name && error.name.startsWith('Mongo')) {
                throw new Error('Database operation failed. Please check your data and try again');
            }

            if (
                error.message.includes('Missing required field') ||
                error.message.includes('Invalid') ||
                error.message.includes('must be') ||
                error.message.includes('already exists') ||
                error.message.includes('You already have')
            ) {
                throw error;
            }

            console.error('Unexpected error in createDocumentRecord:', error);
            throw new Error('Failed to create document record. Please verify your data and try again');
        }
    }

    /**
     * Get a single document (was: getInsuranceById)
     */
    async getInsuranceById(documentId, userId = null) {
        try {
            const query = { _id: documentId };
            if (userId) query.userId = userId;

            const doc = await Document.findOne(query);
            if (!doc) throw new Error('Document not found');

            return doc;
        } catch (error) {
            throw logError('getInsuranceById', error, { documentId, userId });
        }
    }

    /**
     * Get ALL insurance policies for a user (filters optional).
     * Backward compatible—filters are applied on Document with documentType=insurance_policy
     */
    async getUserInsurances(userId, filters = {}) {
        try {
            const query = { userId, documentType: 'insurance_policy', ...filters };
            const docs = await Document.find(query).sort({ createdAt: -1 }).lean();
            return docs;
        } catch (error) {
            throw logError('getUserInsurances', error, { userId });
        }
    }

    /**
     * Returns formatted insurance policies (unchanged output shape)
     */
    async getFormattedUserInsurances(userId, filters = {}) {
        try {
            const query = { userId, documentType: 'insurance_policy', ...filters };
            const insurances = await Document.find(query).sort({ createdAt: -1 }).lean();

            const userEmail = insurances.length > 0 ? (insurances[0]?.beneficiary?.email || '') : '';
            const activePolicies = insurances.filter((d) => d.status === 'active').length;

            const formattedPolicies = insurances.map((d) => {
                const start = d?.coveragePeriod?.startDate ? new Date(d.coveragePeriod.startDate) : null;
                const end = d?.coveragePeriod?.endDate ? new Date(d.coveragePeriod.endDate) : null;
                const birth = d?.beneficiary?.birthDate ? new Date(d.beneficiary.birthDate) : null;

                const formatted = {
                    _id: d._id,
                    policyId: d.policyId,
                    policyType: d.insuranceCategory,
                    policyNumber: d.policyNumber,
                    status: d.status,
                    productName: d.productName,
                    coveragePeriod: {
                        startDate: start ? start.toISOString().split('T')[0] : null,
                        endDate: end ? end.toISOString().split('T')[0] : null
                    },
                    beneficiary: {
                        name: d?.beneficiary?.name || null,
                        email: d?.beneficiary?.email || null,
                        birthDate: birth ? birth.toISOString().split('T')[0] : null,
                        documentNumber: d?.beneficiary?.documentNumber || null,
                        residenceCountry: d?.beneficiary?.residenceCountry || null
                    },
                    duration: d.duration ?? null,
                    coverage: d.coverage ?? null,
                    docUrl: d.docUrl || null,
                    createdAt: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : null
                };

                if (d.cancelDate) {
                    const c = new Date(d.cancelDate);
                    formatted.cancelDate = c.toISOString().split('T')[0];
                }
                return formatted;
            });

            return {
                email: userEmail,
                activePolicies,
                policies: formattedPolicies
            };
        } catch (error) {
            throw logError('getFormattedUserInsurances', error, { userId });
        }
    }

    /**
     * Update insurance STATUS only (still insurance-only)
     */
    async updateInsuranceStatus(documentId, status, userId) {
        try {
            const validStatuses = ['active', 'expired', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status. Must be active, expired, or cancelled');
            }

            // Ensure document belongs to user and is an insurance_policy
            const doc = await Document.findOne({ _id: documentId, userId, documentType: 'insurance_policy' });
            if (!doc) throw new Error('Insurance not found');

            const update = { status };
            if (status === 'cancelled' && !doc.cancelDate) {
                update.cancelDate = new Date();
            }

            const updated = await Document.findOneAndUpdate(
                { _id: documentId, userId },
                update,
                { new: true }
            );

            if (!updated) throw new Error('Insurance not found');
            return updated;
        } catch (error) {
            throw logError('updateInsuranceStatus', error, { documentId, status, userId });
        }
    }

    /**
     * Delete a document (was: deleteInsurance)
     */
    async deleteInsurance(documentId, userId) {
        try {
            const doc = await Document.findOne({ _id: documentId, userId });
            if (!doc) throw new Error('Document not found');

            if (doc.azureBlobName) {
                try {
                    await this.uploadService.deleteFile(doc.azureBlobName);
                    console.log('Deleted file from Azure storage:', doc.azureBlobName);
                } catch (fileError) {
                    console.error('Failed to delete file from storage:', fileError);
                }
            }

            await Document.deleteOne({ _id: documentId, userId });
            return true;
        } catch (error) {
            throw logError('deleteInsurance', error, { documentId, userId });
        }
    }

    /**
     * Insurance stats (insurance_policy only)
     */
    async getInsuranceStats(userId) {
        try {
            const stats = await Document.aggregate([
                { $match: { userId: new mongoose.Types.ObjectId(userId), documentType: 'insurance_policy' } },
                {
                    $group: {
                        _id: null,
                        totalPolicies: { $sum: 1 },
                        activePolicies: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                        expiredPolicies: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
                        cancelledPolicies: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
                    }
                }
            ]);

            return (
                stats[0] || {
                    totalPolicies: 0,
                    activePolicies: 0,
                    expiredPolicies: 0,
                    cancelledPolicies: 0
                }
            );
        } catch (error) {
            throw logError('getInsuranceStats', error, { userId });
        }
    }

    /**
     * Update normalized insurance fields (insurance-only)
     */
    async updateInsuranceDetails(documentId, updateData, userId) {
        try {
            const existing = await Document.findOne({ _id: documentId, userId, documentType: 'insurance_policy' });
            if (!existing) throw new Error('Insurance not found');

            const updateObject = {};

            if (updateData.policyNumber !== undefined) {
                updateObject.policyNumber = updateData.policyNumber.toString().trim();
            }

            if (updateData.productName !== undefined) {
                updateObject.productName = updateData.productName.toString().trim();
            }

            if (updateData.status !== undefined) {
                const validStatuses = ['active', 'expired', 'cancelled'];
                if (!validStatuses.includes(updateData.status)) {
                    throw new Error('Invalid status. Must be active, expired, or cancelled');
                }
                updateObject.status = updateData.status;

                if (updateData.status === 'cancelled' && !existing.cancelDate) {
                    updateObject.cancelDate = new Date();
                }
            }

            if (updateData.duration !== undefined) {
                const duration = Number(updateData.duration);
                if (isNaN(duration) || duration <= 0) throw new Error('Duration must be a positive number');
                updateObject.duration = duration;
            }

            if (updateData.coverage !== undefined) {
                updateObject.coverage = updateData.coverage.toString().trim();
            }

            if (updateData.coveragePeriod) {
                const coveragePeriod = {};

                if (updateData.coveragePeriod.startDate !== undefined) {
                    const startDate = new Date(updateData.coveragePeriod.startDate);
                    if (isNaN(startDate.getTime())) throw new Error('Invalid coverage start date format');
                    coveragePeriod.startDate = startDate;
                }

                if (updateData.coveragePeriod.endDate !== undefined) {
                    const endDate = new Date(updateData.coveragePeriod.endDate);
                    if (isNaN(endDate.getTime())) throw new Error('Invalid coverage end date format');
                    coveragePeriod.endDate = endDate;
                }

                const finalStartDate = coveragePeriod.startDate || existing.coveragePeriod.startDate;
                const finalEndDate = coveragePeriod.endDate || existing.coveragePeriod.endDate;
                if (finalStartDate >= finalEndDate) {
                    throw new Error('Coverage start date must be before end date');
                }

                if (coveragePeriod.startDate !== undefined) {
                    updateObject['coveragePeriod.startDate'] = coveragePeriod.startDate;
                }
                if (coveragePeriod.endDate !== undefined) {
                    updateObject['coveragePeriod.endDate'] = coveragePeriod.endDate;
                }
            }

            if (updateData.beneficiary) {
                if (updateData.beneficiary.name !== undefined) {
                    updateObject['beneficiary.name'] = updateData.beneficiary.name.toString().trim();
                }
                if (updateData.beneficiary.email !== undefined) {
                    const email = updateData.beneficiary.email.toString().toLowerCase().trim();
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email)) {
                        throw new Error('Invalid email format');
                    }
                    updateObject['beneficiary.email'] = email;
                }
                if (updateData.beneficiary.birthDate !== undefined) {
                    const birthDate = new Date(updateData.beneficiary.birthDate);
                    if (isNaN(birthDate.getTime())) throw new Error('Invalid beneficiary birth date format');
                    updateObject['beneficiary.birthDate'] = birthDate;
                }
                if (updateData.beneficiary.documentNumber !== undefined) {
                    updateObject['beneficiary.documentNumber'] = updateData.beneficiary.documentNumber.toString().trim();
                }
                if (updateData.beneficiary.residenceCountry !== undefined) {
                    updateObject['beneficiary.residenceCountry'] = updateData.beneficiary.residenceCountry.toString().trim();
                }
            }

            if (updateData.cancelDate !== undefined) {
                if (updateData.cancelDate === null || updateData.cancelDate === '') {
                    updateObject.cancelDate = null;
                } else {
                    const cancelDate = new Date(updateData.cancelDate);
                    if (isNaN(cancelDate.getTime())) throw new Error('Invalid cancellation date format');
                    updateObject.cancelDate = cancelDate;
                }
            }

            if (Object.keys(updateObject).length === 0) {
                throw new Error('No valid fields provided for update');
            }

            const updated = await Document.findOneAndUpdate(
                { _id: documentId, userId },
                { $set: updateObject },
                { new: true, runValidators: true }
            );

            if (!updated) throw new Error('Insurance not found');
            console.log('Insurance record updated successfully:', documentId);
            return updated;
        } catch (error) {
            if (error.code === 11000) {
                if (error.keyPattern && error.keyPattern.policyNumber) {
                    throw new Error(`Insurance policy with number '${updateData?.policyNumber}' already exists`);
                }
                const duplicateField = Object.keys(error.keyPattern || {})[0] || 'unknown field';
                throw new Error(`Duplicate value for ${duplicateField}`);
            }

            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map((err) => err.message);
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            if (error.name === 'CastError') {
                throw new Error(`Invalid data type for field '${error.path}': ${error.message}`);
            }

            if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
                throw new Error('Database connection error. Please try again later');
            }

            if (
                error.message.includes('not found') ||
                error.message.includes('Invalid') ||
                error.message.includes('must be') ||
                error.message.includes('already exists') ||
                error.message.includes('No valid fields')
            ) {
                throw error;
            }

            console.error('Unexpected error in updateInsuranceDetails:', error);
            throw new Error('Failed to update insurance record. Please verify your data and try again');
        }
    }

    /**
     * Insurance catalog utility (unchanged)
     */
    async getInsurancesToBuy(type) {
        try {
            if (!type) {
                return {
                    success: true,
                    message: 'Available insurance types',
                    data: {
                        availableTypes: getAllInsuranceTypes(),
                        count: getAllInsuranceTypes().length
                    }
                };
            }

            const availableTypes = getAllInsuranceTypes();
            if (!availableTypes.includes(type.toLowerCase())) {
                return {
                    success: false,
                    message: `Invalid insurance type. Available types: ${availableTypes.join(', ')}`,
                    data: {
                        availableTypes,
                        requestedType: type
                    }
                };
            }

            const insurances = getInsurancesByType(type.toLowerCase());

            return {
                success: true,
                message: `${type.charAt(0).toUpperCase() + type.slice(1)} insurances retrieved successfully`,
                data: {
                    type: type.toLowerCase(),
                    insurances,
                    count: insurances.length,
                    country: 'Mauritius'
                }
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error retrieving insurances',
                error: error.message
            };
        }
    }
}

module.exports = new InsuranceService();
