// models/insurance.js
const mongoose = require('mongoose');

const insuranceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    policyId: { type: String, unique: true },
    policyNumber: { type: String },
    status: { 
        type: String, 
        enum: ['active', 'expired', 'cancelled']
    },
    productName: { type: String },
    coveragePeriod: {
        startDate: { type: Date },
        endDate: { type: Date }
    },
    beneficiary: {
        name: { type: String },
        email: { type: String },
        birthDate: { type: Date },
        documentNumber: { type: String },
        residenceCountry: { type: String }
    },
    duration: { type: Number }, // number of days
    coverage: { type: String }, // coverage details
    docUrl: { type: String }, // URL to the uploaded document
    cancelDate: { type: Date }, // optional - only for cancelled policies
    chatId: { type: String }, // for websocket communication
    azureBlobName: { type: String }, // Azure blob storage reference
    processingStatus: { 
        type: String, 
        enum: ['pending', 'processing', 'completed', 'failed'], 
        default: 'pending' 
    },
    premium: { type: Number }, // insurance premium amount
    currency: { type: String, default: 'INR' },
    insurer: { type: String, default: 'Arham Insurance Brokers Private Limited' }
}, { timestamps: true });

// Index for faster queries
insuranceSchema.index({ userId: 1, status: 1 });
insuranceSchema.index({ policyNumber: 1 });

module.exports = mongoose.model('Insurance', insuranceSchema);