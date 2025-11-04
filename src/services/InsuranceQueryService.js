// services/InsuranceQueryService.js
const Document = require('../models/insurance'); // UPDATED: generic Document model
const Conversation = require('../models/conversation');
const UploadService = require('./UploadService');
const WebSocketService = require('./websocketService');
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
   * Initialize conversation for querying a document (was: insurance document)
   * @param {string} userId
   * @param {string} insuranceId - Kept param name for backward compat; now refers to a Document _id
   * @param {string} firstQuery
   */
  async initializeInsuranceQuery(userId, insuranceId, firstQuery) {
    try {
      // Load the Document (generic). Enforce ownership.
      const doc = await Document.findOne({ _id: insuranceId, userId });
      if (!doc) {
        throw new Error('Document not found or does not belong to user');
      }

      if (!doc.azureBlobName) {
        throw new Error('No file found for this document');
      }

      // New chatId per conversation
      const chatId = `CHAT-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Step 1: Fetch file bytes from storage
      console.log('Step 1: Retrieving document from Azure storage');
      const fileContent = await this.uploadService.getFileContent(doc.azureBlobName);

      // Step 2: Send to AI service to (re)process into the vector store/session
      console.log('Step 2: Sending document to AI service');
      const aiResponse = await this.sendDocumentToAI(userId, chatId, fileContent, doc.azureBlobName);

      if (!aiResponse || aiResponse.status !== 'upload' || aiResponse.vector !== 'processed') {
        throw new Error('AI service failed to process document properly');
      }
      console.log('Document processed by AI service successfully');

      // Step 3: Persist conversation metadata
      const conversation = new Conversation({
        chatId,
        userId,
        insuranceId, // keep field name for backward compat; stores Document _id
        policyNumber: doc.policyNumber || null, // available for insurance_policy docs
        title: 'New Conversation',
        documentProcessed: true,
        aiServiceResponse: {
          status: aiResponse.status,
          vector: aiResponse.vector,
          processedAt: new Date()
        },
        metadata: {
          documentUrl: doc.docUrl,
          azureBlobName: doc.azureBlobName,
          documentType: doc.documentType
        }
      });

      await conversation.save();
      console.log('Conversation created with chatId:', chatId);

      // Step 4: Ask first question
      const queryResponse = await this.queryInsuranceDocument(userId, chatId, firstQuery);

      return {
        success: true,
        data: {
          chatId,
          conversation: conversation.toObject(),
          queryResponse
        },
        message: 'Document conversation initialized successfully'
      };
    } catch (error) {
      throw logError('initializeInsuranceQuery', error, { userId, insuranceId });
    }
  }

  /**
   * Query a previously processed document in this conversation
   */
  async queryInsuranceDocument(userId, chatId, query) {
    try {
      const conversation = await Conversation.findOne({ chatId, userId });
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      if (!conversation.documentProcessed) {
        throw new Error('Document not yet processed for this conversation');
      }

      const startTime = Date.now();

      console.log(`Sending query to WebSocket for chatId: ${chatId}`);
      const wsResponse = await WebSocketService.sendQuery(userId, chatId, query);

      const responseTime = Date.now() - startTime;

      // Track interaction
      const interactionId = conversation.addInteraction(query, wsResponse.answer, responseTime);

      // Set title on first interaction
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
   * Get conversation history (optionally for a single chatId)
   * Populates the linked Document (formerly Insurance) with key fields.
   */
  async getConversationHistory(userId, chatId = null) {
    try {
      const query = chatId ? { userId, chatId } : { userId };

      const conversations = await Conversation.find(query)
        .populate({
          path: 'insuranceId',
          select: 'policyNumber productName status documentType',
          model: 'Document' // IMPORTANT: point populate to the new model
        })
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
   * Summaries for a user's conversations
   */
  async getUserConversations(userId, limit = 50) {
    try {
      const conversations = await Conversation.find({ userId })
        .populate({
          path: 'insuranceId',
          select: 'policyNumber productName status documentType',
          model: 'Document'
        })
        .select('chatId title metadata.totalQueries metadata.lastActivity createdAt status insuranceId')
        .sort({ 'metadata.lastActivity': -1 })
        .limit(limit)
        .lean();

      return conversations.map((conv) => ({
        chatId: conv.chatId,
        title: conv.title,
        totalQueries: conv.metadata?.totalQueries,
        lastActivity: conv.metadata?.lastActivity,
        createdAt: conv.createdAt,
        status: conv.status,
        insurance: conv.insuranceId // now a populated Document snippet
      }));
    } catch (error) {
      throw logError('getUserConversations', error, { userId });
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(userId, chatId) {
    try {
      const result = await Conversation.deleteOne({ chatId, userId });
      if (result.deletedCount === 0) {
        throw new Error('Conversation not found');
      }

      // Close WebSocket if any
      WebSocketService.closeConnection(userId, chatId);

      return true;
    } catch (error) {
      throw logError('deleteConversation', error, { userId, chatId });
    }
  }

  /**
   * Archive a conversation
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
   * Send a document bytes to AI for processing
   */
  async sendDocumentToAI(userId, chatId, fileContent, fileName) {
    try {
      const FormData = require('form-data');
      const formData = new FormData();

      formData.append('user_id', userId);
      formData.append('chat_id', chatId);
      formData.append('file', fileContent, {
        filename: fileName,
        contentType: 'application/pdf' // could be improved to detect real content type
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
        throw new Error(`AI service error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('AI service did not respond');
      } else {
        throw new Error(`AI service request error: ${error.message}`);
      }
    }
  }

  /**
   * Conversation statistics
   */
  async getConversationStats(userId) {
    try {
      const stats = await Conversation.aggregate([
        { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalConversations: { $sum: 1 },
            activeConversations: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            totalQueries: { $sum: '$metadata.totalQueries' },
            avgQueriesPerConversation: { $avg: '$metadata.totalQueries' },
            avgResponseTime: { $avg: '$metadata.avgResponseTime' }
          }
        }
      ]);

      return (
        stats[0] || {
          totalConversations: 0,
          activeConversations: 0,
          totalQueries: 0,
          avgQueriesPerConversation: 0,
          avgResponseTime: 0
        }
      );
    } catch (error) {
      throw logError('getConversationStats', error, { userId });
    }
  }
}

module.exports = new InsuranceQueryService();
