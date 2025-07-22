// models/claim.js
const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
    claimId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    insuranceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Insurance', required: true },
    policyNumber: { type: String, required: true },
    claimType: { 
        type: String, 
        enum: ['life', 'health', 'motor', 'fire', 'marine', 'accident', 'medical', 'other'], 
        required: true 
    },
    claimAmount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    incidentDate: { type: Date, required: true },
    reportedDate: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['submitted', 'under_review', 'investigating', 'approved', 'rejected', 'paid'],
        default: 'submitted'
    },
    description: { type: String, required: true },
    supportingDocuments: [{
        fileName: String,
        docUrl: String,
        azureBlobName: String,  
        docType: { 
            type: String, 
            enum: ['medical_report', 'police_report', 'bill', 'receipt', 'photo', 'other'] 
        },
        uploadDate: { type: Date, default: Date.now }
    }],
    claimant: {
        name: { type: String, required: true },
        relationship: { 
            type: String, 
            enum: ['self', 'spouse', 'child', 'parent', 'nominee', 'other'],
            required: true 
        },
        contactNumber: { type: String, required: true },
        email: { type: String, required: true },
        address: { type: String, required: true }
    },
    assessor: {
        name: String,
        contactNumber: String,
        assignedDate: Date,
        reportDate: Date,
        reportUrl: String
    },
    approvedAmount: { type: Number },
    rejectionReason: { type: String },
    paymentDetails: {
        paymentDate: Date,
        transactionId: String,
        accountNumber: String,
        paymentMode: { type: String, enum: ['bank_transfer', 'cheque', 'online'] }
    },
    processingNotes: [{
        note: String,
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
        addedDate: { type: Date, default: Date.now },
        stage: String
    }],
    estimatedSettlementDays: { type: Number, default: 30 },
    priority: { 
        type: String, 
        enum: ['low', 'medium', 'high', 'urgent'], 
        default: 'medium' 
    }
}, { timestamps: true });

// Indexes for better query performance
claimSchema.index({ userId: 1, status: 1 });
claimSchema.index({ insuranceId: 1 });
claimSchema.index({ claimId: 1 });
claimSchema.index({ incidentDate: 1 });

module.exports = mongoose.model('Claim', claimSchema);