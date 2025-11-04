// services/ClaimService.js
const Claim = require('../models/claim');
const Insurance = require('../models/insurance');
const UploadService = require('./UploadService');
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

            // Map claim type to valid enum values
            const validClaimTypes = ['life', 'health', 'motor', 'fire', 'marine', 'accident', 'medical', 'other'];
            const normalizedClaimType = claimType.toLowerCase();
            const mappedClaimType = validClaimTypes.includes(normalizedClaimType) ? normalizedClaimType : 'other';

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

            // Handle file uploads if provided
            let supportingDocuments = [];
            if (files && Array.isArray(files) && files.length > 0) {
                try {
                    console.log(`Uploading ${files.length} files for claim ${claimId}`);
                    
                    // Upload files using uploadService
                    const uploadedFiles = await this.uploadService.uploadClaimDocuments(
                        files, 
                        userId, 
                        insurance.policyId || insurance.policyNumber
                    );

                    // Format documents for claim schema
                    supportingDocuments = uploadedFiles.map(file => ({
                        fileName: file.originalName,
                        docUrl: file.url,
                        azureBlobName: file.blobName,
                        docType: this.determineDocType(file.originalName),
                        uploadDate: new Date()
                    }));

                    console.log(`Successfully uploaded ${supportingDocuments.length} documents`);
                } catch (uploadError) {
                    console.error('File upload failed during claim creation:', uploadError);
                    // Continue with claim creation even if file upload fails
                    // You can choose to throw the error if file upload is mandatory
                    // throw new Error(`File upload failed: ${uploadError.message}`);
                }
            }

            // Create claim document with uploaded files
            const claim = new Claim({
                claimId,
                userId,
                insuranceId,
                policyNumber: insurance.policyNumber,
                claimType: mappedClaimType,
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
                supportingDocuments: supportingDocuments // Add uploaded documents here
            });

            await claim.save();
            
            console.log('Claim created with ID:', claim.claimId);
            console.log('Mapped values:', {
                originalClaimType: claimType,
                mappedClaimType,
                originalRelationship: claimant.relationship,
                mappedRelationship,
                originalPriority: claimData.priority,
                mappedPriority,
                documentsUploaded: supportingDocuments.length
            });
            
            return {
                claim,
                documentsUploaded: supportingDocuments.length,
                uploadedDocuments: supportingDocuments
            };

        } catch (error) {
            throw logError('createClaim', error, { userId });
        }
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

            // Format documents for claim schema
            const supportingDocuments = uploadedFiles.map(file => ({
                fileName: file.originalName,
                docUrl: file.url,
                azureBlobName: file.blobName,
                docType: this.determineDocType(file.originalName),
                uploadDate: new Date()
            }));

            // Update claim with new documents
            claim.supportingDocuments = [...claim.supportingDocuments, ...supportingDocuments];
            await claim.save();

            return {
                success: true,
                data: {
                    claimId: claim.claimId,
                    uploadedDocuments: supportingDocuments
                },
                message: 'Supporting documents uploaded successfully'
            };

        } catch (error) {
            throw logError('uploadClaimDocuments', error, { userId, claimId });
        }
    }

    /**
     * Determine document type based on filename
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
        if (lowerFileName.match(/\.(jpg|jpeg|png|gif|bmp)$/)) {
            return 'photo';
        }
        
        return 'other';
    }

    /**
     * Get claim by ID
     * @param {string} claimId - Claim ID
     * @param {string} userId - User ID (optional, for authorization)
     * @returns {Promise<Object>} Claim record
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

            return claims;

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
                    _id: 0 // Exclude the MongoDB _id field
                }
            )
            .sort({ reportedDate: -1 }) // Sort by reportedDate in descending order (newest first)
            .lean(); // Use lean() for better performance since we don't need Mongoose document methods

            return {
                totalClaims: claims.length,
                claims: claims || []
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