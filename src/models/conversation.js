// models/conversation.js
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    insuranceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Insurance', required: true },
    policyNumber: { type: String, required: true },
    title: { type: String, required: true }, // Auto-generated from first query
    status: {
        type: String,
        enum: ['active', 'completed', 'archived'],
        default: 'active'
    },
    documentProcessed: { type: Boolean, default: false },
    aiServiceResponse: {
        status: String,
        vector: String,
        processedAt: Date
    },
    interactions: [{
        interactionId: { type: String, required: true },
        query: { type: String, required: true },
        response: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        responseTime: { type: Number }, // in milliseconds
        queryType: {
            type: String,
            enum: ['user_query', 'system_query'],
            default: 'user_query'
        }
    }],
    metadata: {
        totalQueries: { type: Number, default: 0 },
        avgResponseTime: { type: Number, default: 0 },
        lastActivity: { type: Date, default: Date.now },
        documentUrl: String,
        azureBlobName: String
    }
}, { timestamps: true });

// Indexes for better performance
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ chatId: 1 });
conversationSchema.index({ insuranceId: 1 });
conversationSchema.index({ 'metadata.lastActivity': -1 });

// Methods
conversationSchema.methods.addInteraction = function(query, response, responseTime = 0) {
    const interactionId = `INT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.interactions.push({
        interactionId,
        query,
        response,
        timestamp: new Date(),
        responseTime,
        queryType: 'user_query'
    });
    
    // Update metadata
    this.metadata.totalQueries = this.interactions.length;
    this.metadata.lastActivity = new Date();
    
    // Calculate average response time
    const totalResponseTime = this.interactions.reduce((sum, interaction) => sum + (interaction.responseTime || 0), 0);
    this.metadata.avgResponseTime = Math.round(totalResponseTime / this.interactions.length);
    
    return interactionId;
};

conversationSchema.methods.generateTitle = function() {
    if (this.interactions.length > 0) {
        const firstQuery = this.interactions[0].query;
        // Generate title from first 50 characters of first query
        this.title = firstQuery.length > 50 ? firstQuery.substring(0, 47) + '...' : firstQuery;
    }
};

module.exports = mongoose.model('Conversation', conversationSchema);