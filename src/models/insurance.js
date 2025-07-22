// models/insurance.js
const mongoose = require('mongoose');

const insuranceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    policyId: { type: String, required: true, unique: true },
    policyNumber: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['active', 'expired', 'cancelled'], 
        required: true 
    },
    productName: { type: String, required: true },
    coveragePeriod: {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true }
    },
    beneficiary: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        birthDate: { type: Date, required: true },
        documentNumber: { type: String, required: true },
        residenceCountry: { type: String, required: true }
    },
    duration: { type: Number, required: true }, // number of days
    coverage: { type: String, required: true }, // coverage details
    docUrl: { type: String, required: true }, // URL to the uploaded document
    cancelDate: { type: Date }, // optional - only for cancelled policies
    chatId: { type: String, required: true }, // for websocket communication
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