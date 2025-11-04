// services/ClaimService.js
const Claim = require('../models/claim');
const Insurance = require('../models/insurance');
const UploadService = require('./UploadService');
const InsuranceService = require('./websocketService');
const { v4: uuidv4 } = require('uuid');
const { logError } = require('../utils/logError');
const mongoose = require('mongoose');

class ClaimService {
    constructor() {
        this.uploadService = new UploadService();
    }

    /**
 * Create a new claim
 * @param {string} userId - User ID
 * @param {Object} claimData - Claim data
 * @param {Array} files - Optional files to upload
 * @returns {Promise<Object>} Created claim
 */
    async createClaim(userId, claimData, files = null) {
        try {
            const {
                insuranceId,
                claimType,
                claimAmount,
                incidentDate,
                description,
                claimant
            } = claimData;

            // Validate required fields
            if (!insuranceId || !claimType || !claimAmount || !incidentDate || !description || !claimant) {
                throw new Error('All required fields must be provided');
            }

            // Verify insurance exists and belongs to user
            const insurance = await Insurance.findOne({ _id: insuranceId, userId });
            if (!insurance) {
                throw new Error('Insurance policy not found or does not belong to user');
            }

            // Check if insurance is active
            if (insurance.status !== 'active') {
                throw new Error('Cannot create claim for inactive insurance policy');
            }

            // Validate claim type against enum
            const validClaimTypes = [
                'vehicle', 'two_wheeler', 'car', 'health', 'travel',
                'flight', 'life', 'home', 'personal_accident', 'marine', 'fire', 'other'
            ];
            const normalizedClaimType = claimType.toLowerCase();
            if (!validClaimTypes.includes(normalizedClaimType)) {
                throw new Error(`Invalid claim type. Must be one of: ${validClaimTypes.join(', ')}`);
            }

            // Map relationship to valid enum values
            const validRelationships = ['self', 'spouse', 'child', 'parent', 'nominee', 'other'];
            const normalizedRelationship = claimant.relationship?.toLowerCase() || 'self';
            const mappedRelationship = validRelationships.includes(normalizedRelationship) ? normalizedRelationship : 'other';

            // Map priority to valid enum values
            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            const normalizedPriority = (claimData.priority || 'medium').toLowerCase();
            const mappedPriority = validPriorities.includes(normalizedPriority) ? normalizedPriority : 'medium';

            // Generate unique claim ID
            const claimId = `CLM-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

            // Get required documents for this claim type
            const requiredDocumentTypes = Claim.getRequiredDocumentsByType(normalizedClaimType);

            // Handle file uploads if provided
            let supportingDocuments = [];
            let documentAnalysis = null;

            if (files && Array.isArray(files) && files.length > 0) {
                try {
                    console.log(`Uploading ${files.length} files for claim ${claimId}`);

                    // Upload files using uploadService
                    const uploadedFiles = await this.uploadService.uploadClaimDocuments(
                        files,
                        userId,
                        insurance.policyId || insurance.policyNumber
                    );

                    // Analyze uploaded documents using AI (parallel processing)
                    const documentDetectionResults = await Promise.all(
                        uploadedFiles.map(async (file, index) => {
                            try {
                                // Create a chat session for document analysis if needed
                                const chatId = `claim-${claimId}-doc-${index}`;

                                // Use AI to detect document type
                                const aiDetection = await InsuranceService.getDocumentTypeAndCount(
                                    userId,
                                    chatId,
                                    normalizedClaimType
                                );

                                return {
                                    fileName: file.originalName,
                                    docUrl: file.url,
                                    azureBlobName: file.blobName,
                                    docType: aiDetection.documentType || 'other',
                                    confidence: aiDetection.confidence,
                                    uploadDate: new Date()
                                };
                            } catch (aiError) {
                                console.error('AI detection failed, falling back to filename detection:', aiError);
                                // Fallback to filename-based detection
                                return {
                                    fileName: file.originalName,
                                    docUrl: file.url,
                                    azureBlobName: file.blobName,
                                    docType: this.determineDocType(file.originalName),
                                    uploadDate: new Date()
                                };
                            }
                        })
                    );

                    supportingDocuments = documentDetectionResults;

                    // Analyze document completeness
                    documentAnalysis = this.analyzeDocumentCompleteness(
                        supportingDocuments,
                        requiredDocumentTypes
                    );

                    console.log(`Successfully uploaded and analyzed ${supportingDocuments.length} documents`);
                    console.log('Document analysis:', documentAnalysis);
                } catch (uploadError) {
                    console.error('File upload failed during claim creation:', uploadError);
                    // You can choose to throw the error if file upload is mandatory
                    throw new Error(`File upload failed: ${uploadError.message}`);
                }
            }

            // Create claim document with uploaded files
            const claim = new Claim({
                claimId,
                userId,
                insuranceId,
                policyNumber: insurance.policyNumber,
                claimType: normalizedClaimType,
                claimAmount: Number(claimAmount),
                incidentDate: new Date(incidentDate),
                description,
                claimant: {
                    name: claimant.name,
                    relationship: mappedRelationship,
                    contactNumber: claimant.contactNumber,
                    email: claimant.email,
                    address: claimant.address
                },
                status: 'submitted',
                currency: claimData.currency || 'INR',
                priority: mappedPriority,
                supportingDocuments: supportingDocuments,
                requiredDocumentTypes: requiredDocumentTypes
            });

            await claim.save();

            // Get missing documents
            const missingDocuments = claim.getMissingDocuments();
            const hasAllDocuments = claim.hasAllRequiredDocuments();
            const completionPercentage = this.calculateCompletionPercentage(
                supportingDocuments,
                requiredDocumentTypes
            );

            // Generate user-friendly feedback message
            const feedbackMessage = this.generateDocumentFeedbackMessage(
                requiredDocumentTypes,
                supportingDocuments,
                missingDocuments,
                hasAllDocuments,
                completionPercentage,
                normalizedClaimType
            );

            console.log('Claim created with ID:', claim.claimId);
            console.log('Document status:', {
                requiredDocuments: requiredDocumentTypes,
                uploadedCount: supportingDocuments.length,
                missingDocuments,
                isComplete: hasAllDocuments,
                documentAnalysis
            });
            console.log("feedback message:", feedbackMessage);

            return {
                claim,
                documentsUploaded: supportingDocuments.length,
                message: feedbackMessage.message,
                feedbackType: feedbackMessage.type,
                nextSteps: feedbackMessage.nextSteps
            };

        } catch (error) {
            throw logError('createClaim', error, { userId });
        }
    }

    /**
 * Generate user-friendly feedback message based on document status
 * @param {Array} requiredDocs - Required document types
 * @param {Array} uploadedDocs - Uploaded documents
 * @param {Array} missingDocs - Missing document types
 * @param {boolean} isComplete - Whether all documents are uploaded
 * @param {number} completionPercentage - Completion percentage
 * @param {string} claimType - Type of claim
 * @returns {Object} Feedback message object
 */
    generateDocumentFeedbackMessage(requiredDocs, uploadedDocs, missingDocs, isComplete, completionPercentage, claimType) {
        // Document type display names for better readability
        const docTypeNames = {
            'medical_report': 'Medical Report',
            'police_report': 'Police Report',
            'bill': 'Bill/Invoice',
            'receipt': 'Payment Receipt',
            'photo': 'Photo Evidence',
            'other': 'Supporting Document'
        };

        const formatDocType = (docType) => docTypeNames[docType] || docType;

        // Format claim type for display
        const claimTypeDisplay = claimType.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');

        // CASE 1: All required documents uploaded (100% complete)
        if (isComplete && uploadedDocs.length > 0) {
            return {
                type: 'success',
                message: `✅ Claim submitted successfully! All ${requiredDocs.length} required document${requiredDocs.length > 1 ? 's have' : ' has'} been uploaded. Your ${claimTypeDisplay} claim is now ready for review.`,
                nextSteps: [
                    '🎯 100% Document Match Score - Maximum approval chances!',
                    'Your claim will be reviewed by our team within 2-3 business days',
                    'You will receive updates via email and SMS',
                    'You can track your claim status in the Claims section'
                ]
            };
        }

        // CASE 2: Some documents uploaded but not all (1-99% complete)
        if (uploadedDocs.length > 0 && missingDocs.length > 0) {
            const missingDocsList = missingDocs.map(doc => formatDocType(doc)).join(', ');
            const uploadedCount = uploadedDocs.length;
            const totalRequired = requiredDocs.length;

            // Calculate match score impact
            const matchScoreImpact = this.getMatchScoreMessage(completionPercentage);

            return {
                type: 'warning',
                message: `⚠️ ${claimTypeDisplay} claim created but incomplete! You've uploaded ${uploadedCount} out of ${totalRequired} required document${totalRequired > 1 ? 's' : ''} (${completionPercentage}% complete). ${matchScoreImpact.message}`,
                nextSteps: [
                    `📊 Current Document Match Score: ${completionPercentage}%`,
                    `⚠️ Missing document${missingDocs.length > 1 ? 's' : ''}: ${missingDocsList}`,
                    '💡 Upload all required documents to achieve 100% match score',
                    '✨ Complete documentation significantly increases claim approval chances',
                    'Your claim processing may be delayed until all documents are submitted',
                    'You can upload additional documents from the claim details page'
                ]
            };
        }

        // CASE 3: No documents uploaded (0% complete)
        if (uploadedDocs.length === 0 && requiredDocs.length > 0) {
            const requiredDocsList = requiredDocs.map(doc => formatDocType(doc)).join(', ');

            return {
                type: 'info',
                message: `📋 ${claimTypeDisplay} claim registered! To proceed with your claim and achieve optimal approval chances, please upload all ${requiredDocs.length} required document${requiredDocs.length > 1 ? 's' : ''}.`,
                nextSteps: [
                    `📊 Current Document Match Score: 0% - Action Required!`,
                    `📝 Required document${requiredDocs.length > 1 ? 's' : ''}: ${requiredDocsList}`,
                    '🎯 Upload all documents to achieve 100% match score for maximum approval probability',
                    '⚡ Complete documentation ensures faster claim processing',
                    '✅ Claims with all required documents have higher success rates',
                    'Accepted formats: PDF, JPG, JPEG, PNG (Max 5MB per file)',
                    'You can upload documents from the claim details page'
                ]
            };
        }

        // CASE 4: No required documents for this claim type (edge case)
        if (requiredDocs.length === 0) {
            return {
                type: 'success',
                message: `✅ ${claimTypeDisplay} claim submitted successfully! No additional documents are required for this claim type. Your claim is now under review.`,
                nextSteps: [
                    '🎯 100% Document Match Score - No documents required',
                    'Your claim will be reviewed by our team within 2-3 business days',
                    'You will receive updates via email and SMS',
                    'You can track your claim status in the Claims section'
                ]
            };
        }

        // CASE 5: Default fallback (should rarely occur)
        return {
            type: 'info',
            message: `${claimTypeDisplay} claim has been registered. Please review and upload all required documents to maximize your claim approval chances.`,
            nextSteps: [
                '📊 Upload all required documents to achieve 100% match score',
                '✨ Complete documentation significantly increases approval probability',
                'Check the required documents for your claim type',
                'Contact support if you need assistance'
            ]
        };
    }

    /**
     * Get match score message based on completion percentage
     * @param {number} completionPercentage - Document completion percentage
     * @returns {Object} Match score message
     */
    getMatchScoreMessage(completionPercentage) {
        if (completionPercentage >= 80) {
            return {
                level: 'high',
                message: 'You\'re almost there! Upload the remaining documents to reach 100% match score for optimal claim approval.'
            };
        } else if (completionPercentage >= 50) {
            return {
                level: 'medium',
                message: 'Good progress! Upload all remaining documents to increase your match score and improve approval chances.'
            };
        } else if (completionPercentage >= 25) {
            return {
                level: 'low',
                message: 'More documents needed! Upload all required documents to significantly increase your claim match score and approval probability.'
            };
        } else {
            return {
                level: 'critical',
                message: 'Critical: Most documents are missing! Upload all required documents immediately to improve your match score and claim success rate.'
            };
        }
    }

    /**
     * Format missing documents into detailed readable message
     * @param {Array} missingDocs - Array of missing document types
     * @returns {string} Formatted message
     */
    formatMissingDocumentsMessage(missingDocs) {
        if (!missingDocs || missingDocs.length === 0) {
            return '✅ All required documents have been uploaded. Your claim has 100% document match score!';
        }

        const docTypeNames = {
            'medical_report': 'Medical Report',
            'police_report': 'Police/FIR Report',
            'bill': 'Bill/Invoice',
            'receipt': 'Payment Receipt',
            'photo': 'Photos of damage/incident',
            'other': 'Additional Supporting Documents'
        };

        const descriptions = {
            'medical_report': 'hospital records, prescriptions, lab reports, or doctor\'s certificate',
            'police_report': 'FIR copy, police complaint, or accident report',
            'bill': 'repair bills, hospital bills, treatment invoices, or service charges',
            'receipt': 'payment receipts, transaction proof, or billing statements',
            'photo': 'clear photos showing the damage, accident scene, or medical condition',
            'other': 'any additional relevant supporting documents'
        };

        const formatted = missingDocs.map((doc, index) => {
            const name = docTypeNames[doc] || doc;
            const desc = descriptions[doc] || '';
            return `   ${index + 1}. ${name}${desc ? ` - Include ${desc}` : ''}`;
        }).join('\n');

        return `⚠️ Missing Documents (Upload these to increase your match score):\n${formatted}\n\n💡 Tip: Uploading all required documents increases your claim approval probability by up to 80%!`;
    }

    /**
     * Upload supporting documents for a claim
     * @param {Array} files - Array of file objects [{buffer, filename, contentType}]
     * @param {string} userId - User ID
     * @param {string} claimId - Claim ID
     * @returns {Promise<Object>} Upload result
     */
    async uploadClaimDocuments(files, userId, claimId) {
        try {
            // Find the claim
            const claim = await Claim.findOne({ claimId, userId });
            if (!claim) {
                throw new Error('Claim not found or does not belong to user');
            }

            // Get insurance policy for folder structure
            const insurance = await Insurance.findById(claim.insuranceId);
            if (!insurance) {
                throw new Error('Associated insurance policy not found');
            }

            // Upload documents using existing upload service
            const uploadedFiles = await this.uploadService.uploadClaimDocuments(
                files,
                userId,
                insurance.policyId || insurance.policyNumber
            );

            // Analyze uploaded documents using AI (parallel processing)
            const documentDetectionResults = await Promise.all(
                uploadedFiles.map(async (file, index) => {
                    try {
                        const chatId = `claim-${claimId}-doc-upload-${Date.now()}-${index}`;

                        const aiDetection = await InsuranceService.getDocumentTypeAndCount(
                            userId,
                            chatId,
                            claim.claimType
                        );

                        return {
                            fileName: file.originalName,
                            docUrl: file.url,
                            azureBlobName: file.blobName,
                            docType: aiDetection.documentType || 'other',
                            confidence: aiDetection.confidence,
                            uploadDate: new Date()
                        };
                    } catch (aiError) {
                        console.error('AI detection failed, using fallback:', aiError);
                        return {
                            fileName: file.originalName,
                            docUrl: file.url,
                            azureBlobName: file.blobName,
                            docType: this.determineDocType(file.originalName),
                            uploadDate: new Date()
                        };
                    }
                })
            );

            // Update claim with new documents
            claim.supportingDocuments = [...claim.supportingDocuments, ...documentDetectionResults];
            await claim.save();

            // Get updated document status
            const missingDocuments = claim.getMissingDocuments();
            const hasAllDocuments = claim.hasAllRequiredDocuments();
            const documentAnalysis = this.analyzeDocumentCompleteness(
                claim.supportingDocuments,
                claim.requiredDocumentTypes
            );

            return {
                success: true,
                data: {
                    claimId: claim.claimId,
                    uploadedDocuments: documentDetectionResults,
                    documentStatus: {
                        required: claim.requiredDocumentTypes,
                        missing: missingDocuments,
                        isComplete: hasAllDocuments,
                        completionPercentage: this.calculateCompletionPercentage(
                            claim.supportingDocuments,
                            claim.requiredDocumentTypes
                        ),
                        analysis: documentAnalysis
                    }
                },
                message: hasAllDocuments
                    ? 'All required documents uploaded successfully'
                    : `Documents uploaded. Still missing: ${missingDocuments.join(', ')}`
            };

        } catch (error) {
            throw logError('uploadClaimDocuments', error, { userId, claimId });
        }
    }

    /**
     * Analyze document completeness
     * @param {Array} uploadedDocuments - Array of uploaded documents
     * @param {Array} requiredDocuments - Array of required document types
     * @returns {Object} Document analysis
     */
    analyzeDocumentCompleteness(uploadedDocuments, requiredDocuments) {
        // Count available documents by type
        const availableDocsByType = uploadedDocuments.reduce((acc, doc) => {
            acc[doc.docType] = (acc[doc.docType] || 0) + 1;
            return acc;
        }, {});

        // Check which required documents are fulfilled
        const fulfilledDocs = requiredDocuments.filter(reqDoc => {
            return availableDocsByType[reqDoc] && availableDocsByType[reqDoc] > 0;
        });

        // Check which required documents are missing
        const missingDocs = requiredDocuments.filter(reqDoc => {
            return !availableDocsByType[reqDoc] || availableDocsByType[reqDoc] === 0;
        });

        return {
            availableDocsByType,
            fulfilledDocuments: fulfilledDocs,
            missingDocuments: missingDocs,
            totalRequired: requiredDocuments.length,
            totalFulfilled: fulfilledDocs.length,
            totalMissing: missingDocs.length
        };
    }

    /**
     * Calculate document completion percentage
     * @param {Array} uploadedDocuments - Array of uploaded documents
     * @param {Array} requiredDocuments - Array of required document types
     * @returns {number} Completion percentage
     */
    calculateCompletionPercentage(uploadedDocuments, requiredDocuments) {
        if (!requiredDocuments || requiredDocuments.length === 0) {
            return 100;
        }

        const uploadedTypes = uploadedDocuments.map(doc => doc.docType);
        const fulfilledCount = requiredDocuments.filter(reqDoc =>
            uploadedTypes.includes(reqDoc)
        ).length;

        return Math.round((fulfilledCount / requiredDocuments.length) * 100);
    }

    /**
     * Determine document type based on filename (fallback method)
     * @param {string} fileName - File name
     * @returns {string} Document type
     */
    determineDocType(fileName) {
        const lowerFileName = fileName.toLowerCase();

        if (lowerFileName.includes('medical') || lowerFileName.includes('hospital')) {
            return 'medical_report';
        }
        if (lowerFileName.includes('police') || lowerFileName.includes('fir')) {
            return 'police_report';
        }
        if (lowerFileName.includes('bill') || lowerFileName.includes('invoice')) {
            return 'bill';
        }
        if (lowerFileName.includes('receipt')) {
            return 'receipt';
        }
        if (lowerFileName.match(/\.(jpg|jpeg|png|gif|bmp|png)$/i)) {
            return 'photo';
        }

        return 'other';
    }

    /**
     * Get claim by ID with document status
     * @param {string} claimId - Claim ID
     * @param {string} userId - User ID (optional, for authorization)
     * @returns {Promise<Object>} Claim record with document status
     */
    async getClaimById(claimId, userId = null) {
        try {
            const query = { claimId };
            if (userId) query.userId = userId;

            const claim = await Claim.findOne(query)
                .populate('insuranceId', 'policyNumber productName status')
                .lean();

            if (!claim) {
                throw new Error('Claim not found');
            }

            // Add document completeness info
            const claimDoc = await Claim.findOne(query);
            claim.documentStatus = {
                required: claimDoc.requiredDocumentTypes,
                missing: claimDoc.getMissingDocuments(),
                isComplete: claimDoc.hasAllRequiredDocuments(),
                completionPercentage: this.calculateCompletionPercentage(
                    claim.supportingDocuments,
                    claimDoc.requiredDocumentTypes
                )
            };

            return claim;

        } catch (error) {
            throw logError('getClaimById', error, { claimId, userId });
        }
    }

    /**
     * Get all claims for a user
     * @param {string} userId - User ID
     * @param {Object} filters - Optional filters
     * @returns {Promise<Array>} Array of claim records
     */
    async getUserClaims(userId, filters = {}) {
        try {
            const query = { userId, ...filters };

            const claims = await Claim.find(query)
                .populate('insuranceId', 'policyNumber productName status')
                .sort({ createdAt: -1 })
                .lean();

            // Add document status to each claim
            const claimsWithStatus = await Promise.all(
                claims.map(async (claim) => {
                    const claimDoc = await Claim.findById(claim._id);
                    return {
                        ...claim,
                        documentStatus: {
                            required: claimDoc.requiredDocumentTypes,
                            missing: claimDoc.getMissingDocuments(),
                            isComplete: claimDoc.hasAllRequiredDocuments(),
                            completionPercentage: this.calculateCompletionPercentage(
                                claim.supportingDocuments,
                                claimDoc.requiredDocumentTypes
                            )
                        }
                    };
                })
            );

            return claimsWithStatus;

        } catch (error) {
            throw logError('getUserClaims', error, { userId });
        }
    }

    /**
     * Update claim status
     * @param {string} claimId - Claim ID
     * @param {string} status - New status
     * @param {string} userId - User ID (for authorization)
     * @param {Object} additionalData - Additional data for status update
     * @returns {Promise<Object>} Updated claim
     */
    async updateClaimStatus(claimId, status, userId, additionalData = {}) {
        try {
            const validStatuses = ['submitted', 'under_review', 'investigating', 'approved', 'rejected', 'paid'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid claim status');
            }

            const updateData = { status };

            // Add specific data based on status
            switch (status) {
                case 'approved':
                    if (additionalData.approvedAmount) {
                        updateData.approvedAmount = additionalData.approvedAmount;
                    }
                    break;
                case 'rejected':
                    if (additionalData.rejectionReason) {
                        updateData.rejectionReason = additionalData.rejectionReason;
                    }
                    break;
                case 'paid':
                    if (additionalData.paymentDetails) {
                        updateData.paymentDetails = additionalData.paymentDetails;
                    }
                    break;
            }

            const claim = await Claim.findOneAndUpdate(
                { claimId, userId },
                updateData,
                { new: true }
            ).populate('insuranceId', 'policyNumber productName status');

            if (!claim) {
                throw new Error('Claim not found');
            }

            return claim;

        } catch (error) {
            throw logError('updateClaimStatus', error, { claimId, status, userId });
        }
    }

    /**
     * Add processing note to claim
     * @param {string} claimId - Claim ID
     * @param {string} note - Processing note
     * @param {string} addedBy - User ID of person adding note
     * @param {string} stage - Current processing stage
     * @returns {Promise<Object>} Updated claim
     */
    async addProcessingNote(claimId, note, addedBy, stage) {
        try {
            const claim = await Claim.findOne({ claimId });

            if (!claim) {
                throw new Error('Claim not found');
            }

            claim.processingNotes.push({
                note,
                addedBy,
                addedDate: new Date(),
                stage
            });

            await claim.save();
            return claim;

        } catch (error) {
            throw logError('addProcessingNote', error, { claimId });
        }
    }

    /**
     * Get claims by insurance policy
     * @param {string} insuranceId - Insurance ID
     * @param {string} userId - User ID (for authorization)
     * @returns {Promise<Array>} Array of claims
     */
    async getClaimsByInsurance(insuranceId, userId) {
        try {
            const claims = await Claim.find({ insuranceId, userId })
                .sort({ createdAt: -1 })
                .lean();

            return claims;

        } catch (error) {
            throw logError('getClaimsByInsurance', error, { insuranceId, userId });
        }
    }

    /**
     * Get claim statistics for user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Claim statistics
     */
    async getClaimStats(userId) {
        try {
            const claims = await Claim.find(
                { userId: new mongoose.Types.ObjectId(userId) },
                {
                    claimId: 1,
                    policyNumber: 1,
                    claimType: 1,
                    claimAmount: 1,
                    currency: 1,
                    reportedDate: 1,
                    status: 1,
                    incidentDate: 1,
                    priority: 1,
                    supportingDocuments: 1,
                    requiredDocumentTypes: 1,
                    _id: 0
                }
            )
                .sort({ reportedDate: -1 })
                .lean();

            // Add document status to claims
            const claimsWithDocStatus = claims.map(claim => ({
                ...claim,
                documentStatus: {
                    totalUploaded: claim.supportingDocuments?.length || 0,
                    totalRequired: claim.requiredDocumentTypes?.length || 0,
                    completionPercentage: this.calculateCompletionPercentage(
                        claim.supportingDocuments || [],
                        claim.requiredDocumentTypes || []
                    )
                }
            }));

            return {
                totalClaims: claims.length,
                claims: claimsWithDocStatus || []
            };

        } catch (error) {
            throw logError('getClaimStats', error, { userId });
        }
    }

    /**
     * Delete claim
     * @param {string} claimId - Claim ID
     * @param {string} userId - User ID (for authorization)
     * @returns {Promise<boolean>} Deletion success
     */
    async deleteClaim(claimId, userId) {
        try {
            const claim = await Claim.findOne({ claimId, userId });

            if (!claim) {
                throw new Error('Claim not found');
            }

            // Only allow deletion if claim is in submitted status
            if (claim.status !== 'submitted') {
                throw new Error('Cannot delete claim that is already under review or processed');
            }

            // Delete supporting documents from Azure storage
            for (const doc of claim.supportingDocuments) {
                if (doc.azureBlobName) {
                    try {
                        await this.uploadService.deleteFile(doc.azureBlobName);
                        console.log('Deleted claim document from storage:', doc.azureBlobName);
                    } catch (fileError) {
                        console.error('Failed to delete claim document:', fileError);
                        // Continue with claim deletion even if file deletion fails
                    }
                }
            }

            // Delete claim from database
            await Claim.deleteOne({ claimId, userId });

            return true;

        } catch (error) {
            throw logError('deleteClaim', error, { claimId, userId });
        }
    }
}

module.exports = new ClaimService();