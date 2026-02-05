// services/uploadService.js
const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const { ValidationError } = require('../middleware/errorHandler');

class UploadService {
    constructor() {
        this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        this.containerName = 'arihaminsurance-media';
        this.blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString);
        this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    }

    // Initialize container
    async initializeContainer() {
        console.log("Initializing container");
        await this.containerClient.createIfNotExists({
            access: 'blob' // Public read access for blobs only
        });
    }

    // Validate raw file buffer instead of multipart data
    validateRawFile(fileBuffer, filename, contentType, options = {}) {
        const {
            allowedTypes = [],
            maxFileSize = 10 * 1024 * 1024, // 10MB default
            requiredKeywords = []
        } = options;

        if (!filename) {
            throw new ValidationError('Filename is required');
        }

        if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
            throw new ValidationError('Valid file buffer is required');
        }

        // Check file size
        if (fileBuffer.length > maxFileSize) {
            const sizeMB = Math.round(maxFileSize / (1024 * 1024));
            throw new ValidationError(`File ${filename} exceeds maximum size of ${sizeMB}MB`);
        }
        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(contentType)) {
            throw new ValidationError(`File ${filename} has unsupported type: ${contentType}. Allowed types: ${allowedTypes.join(', ')}`);
        }

        // Check filename length
        if (filename.length > 255) {
            throw new ValidationError(`Filename ${filename} is too long`);
        }

        // Check for required keywords (optional)
        if (requiredKeywords.length > 0) {
            const name = filename.toLowerCase();
            const hasRequiredKeyword = requiredKeywords.some(keyword =>
                name.includes(keyword.toLowerCase())
            );

            if (!hasRequiredKeyword) {
                throw new ValidationError(`File ${filename} doesn't contain required keywords: ${requiredKeywords.join(', ')}`);
            }
        }
    }

    // Upload raw file buffer to blob storage
    async uploadRawFile(fileBuffer, filename, contentType, userId, folderPath = 'general', metadata = {}) {
        try {
            await this.initializeContainer();

            // Generate a unique file name
            const fileExtension = filename.split('.').pop();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileId = uuidv4();
            const blobName = `${folderPath}/${timestamp}-${fileId}.${fileExtension}`;

            // Upload to Azure Blob Storage
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

            await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
                blobHTTPHeaders: {
                    blobContentType: contentType,
                    blobContentDisposition: `attachment; filename="${filename}"`
                },
                metadata: {
                    originalName: filename,
                    uploadDate: new Date().toISOString(),
                    fileSize: fileBuffer.length.toString(),
                    fileId: fileId,
                    userId: userId,
                    ...metadata
                }
            });

            // Get the URL
            const blobUrl = blockBlobClient.url;

            return {
                fileId: fileId,
                originalName: filename,
                url: blobUrl,
                type: this.getMediaType(contentType),
                contentType: contentType,
                size: fileBuffer.length,
                blobName: blobName,
                path: blobUrl // For compatibility with existing schemas
            };

        } catch (uploadError) {
            throw new Error(`Failed to upload file ${filename}: ${uploadError.message}`);
        }
    }

    // Specific method for Arham Insurance documents
    async uploadInsuranceDocument(fileBuffer, filename, contentType, userId) {
        try {
            // Validate insurance document requirements for Arham Insurance
            this.validateRawFile(fileBuffer, filename, contentType, {
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

            // Create unique folder path for user's insurance documents
            const folderPath = `arham-insurance-documents/${userId}`;

            // Upload with insurance-specific metadata
            const uploadedFile = await this.uploadRawFile(
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

            return uploadedFile;
        } catch (error) {
            throw new Error(`Arham Insurance document upload failed: ${error.message}`);
        }
    }

    // Specific method for claim supporting documents
    async uploadClaimDocuments(files, userId, policyId) {
        try {
            const uploadedFiles = [];

            if (!Array.isArray(files) || files.length === 0) {
                throw new ValidationError('Files array is required and cannot be empty');
            }

            if (files.length > 5) {
                throw new ValidationError('Maximum 5 supporting documents allowed');
            }

            for (const file of files) {
                // Validate claim document requirements
                this.validateRawFile(file.buffer, file.filename, file.contentType, {
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

                // Create unique folder path for claim documents
                const folderPath = `arham-claim-documents/${userId}/${policyId}`;

                // Upload with claim-specific metadata
                const uploadedFile = await this.uploadRawFile(
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
            throw new Error(`Arham Insurance claim documents upload failed: ${error.message}`);
        }
    }

    /**
     * Specific method for user profile media (profile photo, banner photo)
     * @param {Object} file - File object {buffer, filename, contentType}
     * @param {string} userId - User ID
     * @param {string} type - 'profile' or 'banner'
     * @returns {Promise<Object>} Uploaded file details
     */
    async uploadUserProfileMedia(file, userId, type = 'profile') {
        try {
            // Validate image requirements
            this.validateRawFile(file.buffer, file.filename, file.contentType, {
                allowedTypes: [
                    'image/jpeg',
                    'image/jpg',
                    'image/png',
                    'image/webp'
                ],
                maxFileSize: 5 * 1024 * 1024, // 5MB for profile photos
            });

            // Create folder path for user's profile media
            const folderPath = `user-profiles/${userId}`;

            // Upload with profile-specific metadata
            const uploadedFile = await this.uploadRawFile(
                file.buffer,
                file.filename,
                file.contentType,
                userId,
                folderPath,
                {
                    documentType: `user-${type}-photo`,
                    uploadedBy: 'user',
                    company: 'Arham Insurance Brokers',
                    companyCode: 'AIBL'
                }
            );

            return uploadedFile;
        } catch (error) {
            throw new Error(`User profile media upload failed: ${error.message}`);
        }
    }

    // Method to get file content for AI processing
    async getFileContent(blobName) {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            const downloadResponse = await blockBlobClient.download();

            const chunks = [];
            for await (const chunk of downloadResponse.readableStreamBody) {
                chunks.push(chunk);
            }

            return Buffer.concat(chunks);
        } catch (error) {
            throw new Error(`Failed to download file content: ${error.message}`);
        }
    }

    // Method to get file as base64 for AI processing
    async getFileAsBase64(blobName) {
        try {
            const content = await this.getFileContent(blobName);
            return content.toString('base64');
        } catch (error) {
            throw new Error(`Failed to convert file to base64: ${error.message}`);
        }
    }

    // Enhanced helper to determine media type
    getMediaType(contentType) {
        if (contentType.startsWith('image/')) return 'image';
        if (contentType.startsWith('video/')) return 'video';
        if (contentType.includes('pdf')) return 'pdf';
        if (contentType.includes('word') || contentType.includes('document')) return 'document';
        if (contentType.includes('excel') || contentType.includes('spreadsheet')) return 'spreadsheet';
        return 'document';
    }

    // Delete file from blob storage
    async deleteFile(blobName) {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            await blockBlobClient.delete();
            console.log(`Successfully deleted file: ${blobName}`);
            return true;
        } catch (error) {
            console.error(`Failed to delete file ${blobName}:`, error);
            return false;
        }
    }

    // Get file metadata
    async getFileMetadata(blobName) {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            const properties = await blockBlobClient.getProperties();
            return {
                contentType: properties.contentType,
                contentLength: properties.contentLength,
                lastModified: properties.lastModified,
                metadata: properties.metadata,
                etag: properties.etag,
                creationTime: properties.creationTime
            };
        } catch (error) {
            throw new Error(`Failed to get file metadata: ${error.message}`);
        }
    }

    // Check if file exists
    async fileExists(blobName) {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            const exists = await blockBlobClient.exists();
            return exists;
        } catch (error) {
            console.error(`Error checking file existence: ${error.message}`);
            return false;
        }
    }

    // Get file URL (for public access)
    getFileUrl(blobName) {
        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
        return blockBlobClient.url;
    }

    // List files in a folder
    async listFilesInFolder(folderPath) {
        try {
            const files = [];
            const listBlobsOptions = {
                prefix: folderPath
            };

            for await (const blob of this.containerClient.listBlobsFlat(listBlobsOptions)) {
                files.push({
                    name: blob.name,
                    size: blob.properties.contentLength,
                    lastModified: blob.properties.lastModified,
                    contentType: blob.properties.contentType,
                    url: this.getFileUrl(blob.name)
                });
            }

            return files;
        } catch (error) {
            throw new Error(`Failed to list files in folder ${folderPath}: ${error.message}`);
        }
    }

    // Batch delete files
    async deleteMultipleFiles(blobNames) {
        const results = [];

        for (const blobName of blobNames) {
            try {
                const success = await this.deleteFile(blobName);
                results.push({ blobName, success, error: null });
            } catch (error) {
                results.push({ blobName, success: false, error: error.message });
            }
        }

        return results;
    }

    // Copy file to another location
    async copyFile(sourceBlobName, destinationBlobName) {
        try {
            const sourceBlockBlobClient = this.containerClient.getBlockBlobClient(sourceBlobName);
            const destinationBlockBlobClient = this.containerClient.getBlockBlobClient(destinationBlobName);

            const copyOperation = await destinationBlockBlobClient.startCopyFromURL(sourceBlockBlobClient.url);
            await copyOperation.pollUntilDone();

            return destinationBlockBlobClient.url;
        } catch (error) {
            throw new Error(`Failed to copy file from ${sourceBlobName} to ${destinationBlobName}: ${error.message}`);
        }
    }

    // Get storage usage statistics
    async getStorageStats() {
        try {
            let totalSize = 0;
            let fileCount = 0;
            const fileTypes = {};

            for await (const blob of this.containerClient.listBlobsFlat()) {
                totalSize += blob.properties.contentLength || 0;
                fileCount++;

                const contentType = blob.properties.contentType || 'unknown';
                fileTypes[contentType] = (fileTypes[contentType] || 0) + 1;
            }

            return {
                totalSize,
                fileCount,
                fileTypes,
                averageFileSize: fileCount > 0 ? Math.round(totalSize / fileCount) : 0,
                formattedTotalSize: this.formatBytes(totalSize)
            };
        } catch (error) {
            throw new Error(`Failed to get storage statistics: ${error.message}`);
        }
    }

    // Utility function to format bytes
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Batch upload multiple files
    async uploadMultipleFiles(files, userId, folderPath = 'general', metadata = {}) {
        try {
            const uploadedFiles = [];

            for (const file of files) {
                this.validateRawFile(file.buffer, file.filename, file.contentType);

                const uploadedFile = await this.uploadRawFile(
                    file.buffer,
                    file.filename,
                    file.contentType,
                    userId,
                    folderPath,
                    metadata
                );

                uploadedFiles.push(uploadedFile);
            }

            return uploadedFiles;
        } catch (error) {
            throw new Error(`Batch upload failed: ${error.message}`);
        }
    }
}

module.exports = UploadService;