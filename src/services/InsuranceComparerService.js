// services/InsuranceComparisonService.js
const UploadService = require('./uploadService');
const axios = require('axios');
const FormData = require('form-data');
const { logError } = require('../utils/logError');

class InsuranceComparisonService {
    constructor() {
        this.uploadService = new UploadService();
        this.comparisonBaseUrl = 'https://policy-comparison.happyriver-1999a58f.southindia.azurecontainerapps.io';
        this.uploadEndpoint = `${this.comparisonBaseUrl}/upload-files/`;
        this.processEndpoint = `${this.comparisonBaseUrl}/process-files/`;
    }

    /**
     * Compare multiple insurance documents
     * @param {Array} files - Array of file objects [{buffer, filename, contentType}]
     * @param {string} userId - User ID
     * @param {string} comparisonMetric - Comparison metric (default: 'compare')
     * @returns {Promise<Object>} Comparison results
     */
    async compareInsuranceDocuments(files, userId, comparisonMetric = 'compare') {
        try {
            if (!files || !Array.isArray(files) || files.length < 2) {
                throw new Error('At least 2 insurance documents are required for comparison');
            }

            if (files.length > 10) {
                throw new Error('Maximum 10 documents allowed for comparison');
            }

            console.log(`Starting comparison for ${files.length} documents`);

            // Step 1: Upload documents to Azure storage
            const uploadedFiles = await this.uploadDocumentsToAzure(files, userId);
            console.log(`Uploaded ${uploadedFiles.length} documents to Azure storage`);

            // Step 2: Upload documents to comparison service
            const uploadResponse = await this.uploadToComparisonService(files);
            console.log('Documents uploaded to comparison service:', uploadResponse);

            // Step 3: Extract session ID from upload response
            const sessionId = this.extractSessionId(uploadResponse);
            console.log('Extracted session ID:', sessionId);

            // Step 4: Process comparison
            const comparisonResults = await this.processComparison(sessionId, comparisonMetric);
            console.log('Comparison processing completed');

            // Step 5: Format and return results
            const formattedResults = this.formatComparisonResults(comparisonResults, uploadedFiles);

            return {
                success: true,
                data: formattedResults,
                message: 'Insurance documents compared successfully'
            };

        } catch (error) {
            throw logError('compareInsuranceDocuments', error, { userId });
        }
    }

    /**
     * Upload documents to Azure storage
     * @param {Array} files - Array of file objects
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of uploaded file info
     */
    async uploadDocumentsToAzure(files, userId) {
        try {
            const folderPath = `insurance-comparisons/${userId}/${Date.now()}`;
            const uploadedFiles = [];

            for (const file of files) {
                // Validate file
                this.uploadService.validateRawFile(file.buffer, file.filename, file.contentType, {
                    allowedTypes: [
                        'application/pdf',
                        'image/jpeg',
                        'image/jpg',
                        'image/png',
                        'image/tiff',
                        'image/bmp'
                    ],
                    maxFileSize: 15 * 1024 * 1024, // 15MB
                });

                // Upload to Azure
                const uploadedFile = await this.uploadService.uploadRawFile(
                    file.buffer,
                    file.filename,
                    file.contentType,
                    userId,
                    folderPath,
                    {
                        documentType: 'insurance-comparison',
                        uploadedBy: 'user',
                        purpose: 'comparison'
                    }
                );

                uploadedFiles.push(uploadedFile);
            }

            return uploadedFiles;
        } catch (error) {
            throw new Error(`Failed to upload documents to Azure: ${error.message}`);
        }
    }

    /**
     * Upload files to comparison service
     * @param {Array} files - Array of file objects
     * @returns {Promise<Object>} Upload response
     */
    async uploadToComparisonService(files) {
        try {
            const formData = new FormData();

            // Add each file to form data
            for (const file of files) {
                formData.append('files', file.buffer, {
                    filename: file.filename,
                    contentType: file.contentType || 'application/pdf'
                });
            }

            const response = await axios.post(this.uploadEndpoint, formData, {
                headers: {
                    'accept': 'application/json',
                    ...formData.getHeaders()
                },
                timeout: 120000 // 2 minutes timeout
            });

            if (!response.data || !response.data.uploaded_files) {
                throw new Error('Invalid response from comparison service');
            }

            return response.data;
        } catch (error) {
            if (error.response) {
                console.error('Comparison service upload error:', error.response.data);
                throw new Error(`Comparison service error: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.request) {
                throw new Error('Comparison service did not respond');
            } else {
                throw new Error(`Upload request error: ${error.message}`);
            }
        }
    }

    /**
     * Extract session ID from upload response
     * @param {Object} uploadResponse - Upload response from comparison service
     * @returns {string} Session ID
     */
    extractSessionId(uploadResponse) {
        try {
            if (!uploadResponse.uploaded_files || uploadResponse.uploaded_files.length === 0) {
                throw new Error('No uploaded files found in response');
            }

            // Extract session ID from file path (e.g., "/tmp/tmp6jg1cg7z/file.pdf" -> "tmp6jg1cg7z")
            const filePath = uploadResponse.uploaded_files[0];
            const match = filePath.match(/\/tmp\/([^\/]+)\//);
            
            if (!match || !match[1]) {
                throw new Error('Could not extract session ID from file path');
            }

            return match[1];
        } catch (error) {
            throw new Error(`Failed to extract session ID: ${error.message}`);
        }
    }

    /**
     * Process comparison request
     * @param {string} sessionId - Session ID from upload
     * @param {string} comparisonMetric - Comparison metric
     * @returns {Promise<Object>} Comparison results
     */
    async processComparison(sessionId, comparisonMetric) {
        try {
            const data = new URLSearchParams();
            data.append('comparison_metric', comparisonMetric);
            data.append('user_id', sessionId);

            const response = await axios.post(this.processEndpoint, data, {
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 300000 // 5 minutes timeout for processing
            });

            return response.data;
        } catch (error) {
            if (error.response) {
                console.error('Comparison processing error:', error.response.data);
                throw new Error('Something went wrong during comparison processing');
            } else if (error.request) {
                throw new Error('Comparison service did not respond during processing');
            } else {
                throw new Error(`Processing request error: ${error.message}`);
            }
        }
    }

    /**
     * Format comparison results for frontend
     * @param {Object} comparisonResults - Raw comparison results
     * @param {Array} uploadedFiles - Azure uploaded files info
     * @returns {Object} Formatted results
     */
    formatComparisonResults(comparisonResults, uploadedFiles) {
        try {
            const formatted = {
                comparisonId: `COMP-${Date.now()}`,
                timestamp: new Date().toISOString(),
                documentsCompared: uploadedFiles.length,
                azureFiles: uploadedFiles.map(file => ({
                    fileName: file.originalName,
                    fileId: file.fileId,
                    url: file.url,
                    size: file.size,
                    type: file.type
                })),
                comparison: {}
            };

            // Format file results
            if (comparisonResults.file_results) {
                formatted.comparison.fileResults = comparisonResults.file_results.map(result => ({
                    fileName: result.file,
                    score: result.score,
                    analysis: result.analysis || {}
                }));
            }

            // Format table data
            if (comparisonResults.table) {
                formatted.comparison.tableData = comparisonResults.table;
            }

            // Format queries
            if (comparisonResults.queries) {
                formatted.comparison.queries = comparisonResults.queries;
            }

            // Format summary
            if (comparisonResults.summary) {
                formatted.comparison.summary = comparisonResults.summary;
            }

            // Extract key insights
            formatted.comparison.insights = this.extractKeyInsights(comparisonResults);

            // Calculate overall comparison score
            formatted.comparison.overallScore = this.calculateOverallScore(comparisonResults.file_results);

            return formatted;
        } catch (error) {
            console.error('Error formatting comparison results:', error);
            throw new Error('Failed to format comparison results');
        }
    }

    /**
     * Extract key insights from comparison results
     * @param {Object} comparisonResults - Raw comparison results
     * @returns {Object} Key insights
     */
    extractKeyInsights(comparisonResults) {
        const insights = {
            bestPerformingFile: null,
            commonIssues: [],
            recommendations: []
        };

        if (comparisonResults.file_results && comparisonResults.file_results.length > 0) {
            // Find best performing file (highest score)
            const bestFile = comparisonResults.file_results.reduce((prev, current) => 
                (prev.score > current.score) ? prev : current
            );
            insights.bestPerformingFile = {
                fileName: bestFile.file,
                score: bestFile.score
            };

            // Extract common issues from analysis
            const allAnalysis = comparisonResults.file_results.flatMap(result => 
                Object.values(result.analysis || {})
            );
            
            const commonTerms = ['not provide', 'no information', 'does not', 'not available'];
            insights.commonIssues = commonTerms.filter(term => 
                allAnalysis.some(analysis => analysis.toLowerCase().includes(term))
            );

            // Generate recommendations
            if (insights.commonIssues.length > 0) {
                insights.recommendations.push('Consider documents with more comprehensive coverage details');
                insights.recommendations.push('Look for policies that include specific premium and claims information');
            }
        }

        return insights;
    }

    /**
     * Calculate overall comparison score
     * @param {Array} fileResults - File results array
     * @returns {number} Overall score
     */
    calculateOverallScore(fileResults) {
        if (!fileResults || fileResults.length === 0) return 0;
        
        const totalScore = fileResults.reduce((sum, result) => sum + (result.score || 0), 0);
        return Math.round((totalScore / fileResults.length) * 100) / 100;
    }

    /**
     * Get comparison history for user
     * @param {string} userId - User ID
     * @param {number} limit - Number of comparisons to return
     * @returns {Promise<Array>} Array of comparison history
     */
    async getComparisonHistory(userId, limit = 10) {
        try {
            // This would typically come from a database
            // For now, we'll return empty array as this requires additional model setup
            console.log(`Getting comparison history for user: ${userId}`);
            return [];
        } catch (error) {
            throw logError('getComparisonHistory', error, { userId });
        }
    }
}

module.exports = new InsuranceComparisonService();