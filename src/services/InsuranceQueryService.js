// services/InsuranceQueryService.js
const Insurance = require('../models/insurance');
const Conversation = require('../models/conversation');
const UploadService = require('./UploadService');
const WebSocketService = require('./WebSocketService');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { logError } = require('../utils/logError');

class InsuranceQueryService {
    constructor() {
        this.uploadService = new UploadService();
        this.docInsightsUrl = 'https://doc-insights.happyriver-1999a58f.southindia.azurecontainerapps.io/upload';
        this.apiKey = 'FTARhQyFxwx4efXbKQe8oa8FQ4OVhm3itTGVJLW1QPxxwL5LP5i7jOI1dK5JGaPeLYZrVRo92yM5XDcPHsfEeZCCXP36uxltrIeHZ58Ux8orG1bAOdiFcf1N8QS23EEM';
    }

    /**
     * Initialize conversation for insurance document querying
     * @param {string} userId - User ID
     * @param {string} insuranceId - Insurance ID
     * @param {string} firstQuery - First query from user
     * @returns {Promise<Object>} Conversation and query response
     */
    async initializeInsuranceQuery(userId, insuranceId, firstQuery) {
        try {
            // Get insurance document
            const insurance = await Insurance.findOne({ _id: insuranceId, userId });
            if (!insurance) {
                throw new Error('Insurance policy not found or does not belong to user');
            }

            if (!insurance.azureBlobName) {
                throw new Error('No document found for this insurance policy');
            }

            // Generate new chat ID for this conversation
            const chatId = `CHAT-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

            // Step 1: Get document from Azure storage
            console.log('Step 1: Retrieving document from Azure storage');
            const fileContent = await this.uploadService.getFileContent(insurance.azureBlobName);

            // Step 2: Send document to AI service for processing
            console.log('Step 2: Sending document to AI service');
            const aiResponse = await this.sendDocumentToAI(userId, chatId, fileContent, insurance.azureBlobName);

            if (!aiResponse || aiResponse.status !== 'upload' || aiResponse.vector !== 'processed') {
                throw new Error('AI service failed to process document properly');
            }

            console.log('Document processed by AI service successfully');

            // Step 3: Create conversation record
            const conversation = new Conversation({
                chatId,
                userId,
                insuranceId,
                policyNumber: insurance.policyNumber,
                title: 'New Conversation', // Will be updated after first query
                documentProcessed: true,
                aiServiceResponse: {
                    status: aiResponse.status,
                    vector: aiResponse.vector,
                    processedAt: new Date()
                },
                metadata: {
                    documentUrl: insurance.docUrl,
                    azureBlobName: insurance.azureBlobName
                }
            });

            await conversation.save();
            console.log('Conversation created with chatId:', chatId);

            // Step 4: Send first query and get response
            const queryResponse = await this.queryInsuranceDocument(userId, chatId, firstQuery);

            return {
                success: true,
                data: {
                    chatId,
                    conversation: conversation.toObject(),
                    queryResponse
                },
                message: 'Insurance document conversation initialized successfully'
            };

        } catch (error) {
            throw logError('initializeInsuranceQuery', error, { userId, insuranceId });
        }
    }

    /**
     * Query insurance document (for existing conversations)
     * @param {string} userId - User ID
     * @param {string} chatId - Chat ID
     * @param {string} query - User query
     * @returns {Promise<Object>} Query response
     */
    async queryInsuranceDocument(userId, chatId, query) {
        try {
            // Find existing conversation
            const conversation = await Conversation.findOne({ chatId, userId });
            if (!conversation) {
                throw new Error('Conversation not found');
            }

            if (!conversation.documentProcessed) {
                throw new Error('Document not yet processed for this conversation');
            }

            const startTime = Date.now();

            // Send query to WebSocket service
            console.log(`Sending query to WebSocket for chatId: ${chatId}`);
            const wsResponse = await WebSocketService.sendQuery(userId, chatId, query);

            const responseTime = Date.now() - startTime;

            // Add interaction to conversation
            const interactionId = conversation.addInteraction(query, wsResponse.answer, responseTime);

            // Update title if this is the first interaction
            if (conversation.interactions.length === 1) {
                conversation.generateTitle();
            }

            await conversation.save();

            console.log(`Query processed successfully. InteractionId: ${interactionId}`);

            return {
                success: true,
                data: {
                    interactionId,
                    query,
                    response: wsResponse.answer,
                    responseTime,
                    conversationId: conversation._id,
                    totalInteractions: conversation.interactions.length
                },
                message: 'Query processed successfully'
            };

        } catch (error) {
            throw logError('queryInsuranceDocument', error, { userId, chatId });
        }
    }

    /**
     * Get conversation history
     * @param {string} userId - User ID
     * @param {string} chatId - Chat ID (optional)
     * @returns {Promise<Object>} Conversation history
     */
    async getConversationHistory(userId, chatId = null) {
        try {
            let query = { userId };
            if (chatId) {
                query.chatId = chatId;
            }

            const conversations = await Conversation.find(query)
                .populate('insuranceId', 'policyNumber productName status')
                .sort({ 'metadata.lastActivity': -1 })
                .lean();

            if (chatId && conversations.length === 0) {
                throw new Error('Conversation not found');
            }

            return conversations;

        } catch (error) {
            throw logError('getConversationHistory', error, { userId, chatId });
        }
    }

    /**
     * Get all conversations for a user (summary view)
     * @param {string} userId - User ID
     * @param {number} limit - Number of conversations to return
     * @returns {Promise<Array>} Array of conversation summaries
     */
    async getUserConversations(userId, limit = 50) {
        try {
            const conversations = await Conversation.find({ userId })
                .populate('insuranceId', 'policyNumber productName status')
                .select('chatId title metadata.totalQueries metadata.lastActivity createdAt status')
                .sort({ 'metadata.lastActivity': -1 })
                .limit(limit)
                .lean();

            return conversations.map(conv => ({
                chatId: conv.chatId,
                title: conv.title,
                totalQueries: conv.metadata.totalQueries,
                lastActivity: conv.metadata.lastActivity,
                createdAt: conv.createdAt,
                status: conv.status,
                insurance: conv.insuranceId
            }));

        } catch (error) {
            throw logError('getUserConversations', error, { userId });
        }
    }

    /**
     * Delete conversation
     * @param {string} userId - User ID
     * @param {string} chatId - Chat ID
     * @returns {Promise<boolean>} Deletion success
     */
    async deleteConversation(userId, chatId) {
        try {
            const result = await Conversation.deleteOne({ chatId, userId });
            
            if (result.deletedCount === 0) {
                throw new Error('Conversation not found');
            }

            // Close WebSocket connection if active
            WebSocketService.closeConnection(userId, chatId);

            return true;

        } catch (error) {
            throw logError('deleteConversation', error, { userId, chatId });
        }
    }

    /**
     * Archive conversation
     * @param {string} userId - User ID
     * @param {string} chatId - Chat ID
     * @returns {Promise<Object>} Updated conversation
     */
    async archiveConversation(userId, chatId) {
        try {
            const conversation = await Conversation.findOneAndUpdate(
                { chatId, userId },
                { status: 'archived' },
                { new: true }
            );

            if (!conversation) {
                throw new Error('Conversation not found');
            }

            return conversation;

        } catch (error) {
            throw logError('archiveConversation', error, { userId, chatId });
        }
    }

    /**
     * Send document to AI service for processing
     * @param {string} userId - User ID
     * @param {string} chatId - Chat ID
     * @param {Buffer} fileContent - File content buffer
     * @param {string} fileName - File name
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
     * Get conversation statistics
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Conversation statistics
     */
    async getConversationStats(userId) {
        try {
            const stats = await Conversation.aggregate([
                { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
                {
                    $group: {
                        _id: null,
                        totalConversations: { $sum: 1 },
                        activeConversations: {
                            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                        },
                        totalQueries: { $sum: '$metadata.totalQueries' },
                        avgQueriesPerConversation: { $avg: '$metadata.totalQueries' },
                        avgResponseTime: { $avg: '$metadata.avgResponseTime' }
                    }
                }
            ]);

            return stats[0] || {
                totalConversations: 0,
                activeConversations: 0,
                totalQueries: 0,
                avgQueriesPerConversation: 0,
                avgResponseTime: 0
            };

        } catch (error) {
            throw logError('getConversationStats', error, { userId });
        }
    }
}

module.exports = new InsuranceQueryService();