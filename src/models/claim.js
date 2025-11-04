// models/claim.js
const mongoose = require('mongoose');

// Helper function to get required document types by claim type
const getRequiredDocuments = (claimType) => {
    const requiredDocs = {
        vehicle: ['police_report', 'photo', 'bill'],
        two_wheeler: ['police_report', 'photo', 'bill'],
        car: ['police_report', 'photo', 'bill'],
        health: ['medical_report', 'bill', 'receipt'],
        travel: ['medical_report', 'bill', 'receipt'],
        flight: ['receipt', 'other'], // booking confirmation, delay certificate
        life: ['medical_report', 'other'], // death certificate, legal documents
        home: ['police_report', 'photo', 'bill'],
        personal_accident: ['medical_report', 'police_report', 'bill'],
        marine: ['other', 'photo', 'bill'], // shipping documents, survey reports
        fire: ['police_report', 'photo', 'bill'],
        other: ['other']
    };
    
    return requiredDocs[claimType] || [];
};

const claimSchema = new mongoose.Schema({
    claimId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    insuranceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Insurance', required: true },
    policyNumber: { type: String, required: true },
    claimType: { 
        type: String, 
        enum: [
            'vehicle',
            'two_wheeler',
            'car',
            'health',
            'travel',
            'flight',
            'life',
            'home',
            'personal_accident',
            'marine',
            'fire',
            'other'
        ], 
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
    
    // Store required document types for this claim
    requiredDocumentTypes: {
        type: [String],
        enum: ['medical_report', 'police_report', 'bill', 'receipt', 'photo', 'other']
    },
    
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

// Pre-save middleware to set required documents based on claim type
claimSchema.pre('save', function(next) {
    // Set required documents if not already set
    if (!this.requiredDocumentTypes || this.requiredDocumentTypes.length === 0) {
        this.requiredDocumentTypes = getRequiredDocuments(this.claimType);
    }
    next();
});

// Instance method to check if all required documents are uploaded
claimSchema.methods.hasAllRequiredDocuments = function() {
    const uploadedTypes = this.supportingDocuments.map(doc => doc.docType);
    const required = this.requiredDocumentTypes || getRequiredDocuments(this.claimType);
    
    return required.every(type => uploadedTypes.includes(type));
};

// Instance method to get missing required documents
claimSchema.methods.getMissingDocuments = function() {
    const uploadedTypes = this.supportingDocuments.map(doc => doc.docType);
    const required = this.requiredDocumentTypes || getRequiredDocuments(this.claimType);
    
    return required.filter(type => !uploadedTypes.includes(type));
};

// Static method to get required documents for a claim type
claimSchema.statics.getRequiredDocumentsByType = function(claimType) {
    return getRequiredDocuments(claimType);
};

// Virtual property to check document completeness
claimSchema.virtual('documentComplete').get(function() {
    return this.hasAllRequiredDocuments();
});

// Indexes for better query performance
claimSchema.index({ userId: 1, status: 1 });
claimSchema.index({ insuranceId: 1 });
claimSchema.index({ claimId: 1 });
claimSchema.index({ incidentDate: 1 });
claimSchema.index({ claimType: 1, status: 1 });

// Ensure virtuals are included in JSON
claimSchema.set('toJSON', { virtuals: true });
claimSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Claim', claimSchema);