const AzureStorageUploader = require('../utils/azureStorageUploader');
const Document = require('../models/userDocument');
const {logError} = require('../utils/logError');
const {azureStorageContainerName, azureStorageSASToken} = require("../config/app.config");

class UploadDocumentController {

    uploadDocument = async (request, context) => {
        try {
            const userId = context.user?._id;
            const docType = request.query?.type;

            if (!userId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'User ID is required'
                    }
                };
            }
            // Check if file is present
            if (!request.files) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'No file uploaded'
                    }
                };
            }

            const file = request.files;
            context.log("upload request file", file);
            // Initialize Azure Storage Uploader
            const uploader = new AzureStorageUploader(
                azureStorageContainerName,
                azureStorageSASToken
            );

            // Create folder path
            const folderPath = `arham/user-document-${userId}`;

            // Upload file to Azure Storage
            const result = await uploader.saveFileInFolder(
                azureStorageContainerName,
                folderPath,
                file.files.data,
                file.files.name
            );
            console.log("result...", result);

            // Create document entry in database
            const newDocument = new Document({
                userId: userId,
                fileName: file.files.name,
                documentType: docType,
                fileUrl: result.url
            });

            // Save document metadata
            await newDocument.save();

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Document uploaded successfully',
                    data: {
                        _id: newDocument._id,
                        fileName: newDocument.fileName,
                        fileUrl: newDocument.fileUrl,
                        type: newDocument.documentType
                    }
                }
            };
        } catch (error) {
            context.error('Error uploading document:', error);
            const err = logError('uploadDocument', error, { userId: request.query?.userId });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error uploading document',
                    error: err.message
                }
            };
        }
    }

    deleteDoc = async (request, context) => {
        try {
            const { id } = request.params || {};

            if (!id) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Document ID is required'
                    }
                };
            }

            const result = await Document.findByIdAndDelete(id);

            if (!result) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'Document not found'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Document deleted successfully',
                    data: result
                }
            };
        } catch (error) {
            context.error('Error deleting document:', error);
            const err = logError('deleteDoc', error, { documentId: request.params?.id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error deleting document',
                    error: err.message
                }
            };
        }
    }

    getUserDocuments = async (request, context) => {
        try {
            const userId = context.user?._id;

            if (!userId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'User ID is required'
                    }
                };
            }

            // Find all documents for the user
            const documents = await Document.find({ userId: userId })
                .select('fileName fileUrl createdAt documentType')
                .sort({ createdAt: -1 }); // Sort by most recent first

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    count: documents.length,
                    data: documents,
                    message: 'Documents retrieved successfully'
                }
            };
        } catch (error) {
            context.error('Error fetching user documents:', error);
            const err = logError('getUserDocuments', error, { userId: request.params?.userId });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error fetching documents',
                    error: err.message
                }
            };
        }
    }

    getSpecificTypeUserDocument = async (request, context) => {
        try {
            const userId = context.user?._id;
            const type = request.query?.type;

            if (!userId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'User ID is required'
                    }
                };
            }

            if (!type) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Document type is required'
                    }
                };
            }

            // Find all documents for the user by type
            const documents = await Document.find({ userId: userId, documentType: type })
                .select('fileName fileUrl createdAt documentType')
                .sort({ createdAt: -1 }); // Sort by most recent first

            if (documents.length === 0) {
                return {
                    status: 200,
                    jsonBody: {
                        success: 0,
                        count: 0,
                        data: [],
                        message: 'No documents found for the specified type'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: 1,
                    count: documents.length,
                    data: documents,
                    message: 'Documents retrieved successfully'
                }
            };
        } catch (error) {
            context.error('Error fetching user documents:', error);
            const err = logError('getSpecificTypeUserDocument', error, { userId: request.query?.userId });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error fetching documents',
                    error: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new UploadDocumentController();
