const axios = require('axios');
const crypto = require('crypto');

class AzureStorageUploader {
    constructor(storageAccount, sasToken) {
        this.storageAccount = storageAccount;
        this.sasToken = sasToken;
        this.baseUrl = `https://${storageAccount}.blob.core.windows.net`;
    }

    // Create folder (in Azure, folders are virtual and created by file paths)
    async createFolder(containerName, folderName) {
        // Azure doesn't actually need folder creation - they're virtual
        // We'll just return the folder path
        return `${folderName}/`;
    }

    // Upload file and get URL
    async uploadFile(containerName, folderName, file, fileName) {
        try {
            const fullPath = folderName ? `${folderName}/${fileName}` : fileName;
            const uploadUrl = `${this.baseUrl}/${containerName}/${fullPath}?${this.sasToken}`;
            console.log("upload url ", uploadUrl);

            // If you have file buffer
            const uploadResponse = await axios.put(uploadUrl, file, {
                headers: {
                    'x-ms-blob-type': 'BlockBlob',
                    'Content-Type': 'application/octet-stream'
                }
            });
            console.log("upload response ", uploadResponse);

            if (uploadResponse.status === 201) {
                // Return the public URL (without SAS token for sharing)
                return {
                    url: `${this.baseUrl}/${containerName}/${fullPath}`,
                    status: 'success'
                };
            }

            throw new Error('Upload failed');

        } catch (error) {
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    // Main function to handle folder creation and file upload
    async saveFileInFolder(containerName, folderName, file, fileName) {
        try {
            // Create folder (virtual)
            await this.createFolder(containerName, folderName);

            // Upload file and get URL
            const result = await this.uploadFile(containerName, folderName, file, fileName);
            
            return result;

        } catch (error) {
            console.error('Error in saveFileInFolder:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }
}

module.exports = AzureStorageUploader;