// models/document.js
const mongoose = require('mongoose');

const { Schema } = mongoose;

const documentSchema = new Schema(
  {
    // Ownership / linkage
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    chatId: { type: String }, // for websocket communication

    // Core document identity
    documentType: {
      type: String,
      required: true,
      // Keep open-ended, but suggest common values for consistency:
      enum: [
        'insurance_policy',
        'insurance_claim',
        'invoice',
        'receipt',
        'id_proof',
        'medical_report',
        'ticket_travel',
        'other'
      ],
      default: 'insurance_policy'
    },

    // For insurance documents (optional, but useful for segmentation)
    insuranceCategory: {
      type: String,
      enum: [
        'vehicle',        // generic vehicle bucket
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
      ]
    },

    // Storage / source
    docUrl: { type: String },        // URL to the uploaded document
    azureBlobName: { type: String }, // Azure blob storage reference
    docHash: { type: String },       // optional: hash of file bytes for dedup

    // Extraction lifecycle / status
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    extractorVersion: { type: String },       // e.g., "v2.1"
    extractionConfidence: { type: Number },   // 0–1 or 0–100, your choice
    rawTextPreview: { type: String },         // optional: short snippet of OCR text
    extractedAt: { type: Date },

    /**
     * Generic bag of fields as parsed from AI/OCR—works for *any* document type.
     * e.g., for invoices you might store { invoiceNumber, amount, dueDate, ... }
     * for claims { claimId, claimStatus, ... }, for ID proofs { idNumber, ... }, etc.
     */
    extractedData: { type: Schema.Types.Mixed }, // free-form JSON

    /**
     * Additional user/app-defined attributes (feature flags, tags, etc.)
     */
    genericFields: {
      type: Map,
      of: Schema.Types.Mixed
    },

    /**
     * Normalized insurance policy fields (only populated when documentType === 'insurance_policy')
     * Keeping your original shape so downstream code continues to work.
     */
    policyId: { type: String }, // optional, not unique globally
    policyNumber: { type: String },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'unknown'],
      default: 'unknown'
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
    cancelDate: { type: Date }, // optional - only for cancelled policies
    premium: { type: Number },  // insurance premium amount
    currency: { type: String, default: 'INR' },
    insurer: { type: String, default: 'Arham Insurance Brokers Private Limited' }
  },
  { timestamps: true }
);

/**
 * Index strategy:
 * - Fast filtering by user and type
 * - Sparse unique on (userId, policyId) only when policyId exists (insurance docs)
 * - Sparse index on policyNumber for quick lookups when present
 * - Optional docHash for dedup
 */
documentSchema.index({ userId: 1, documentType: 1, createdAt: -1 });
documentSchema.index({ policyNumber: 1 }, { sparse: true });
documentSchema.index({ insurer: 1 }, { sparse: true });
documentSchema.index({ docHash: 1 }, { sparse: true });

module.exports = mongoose.model('Document', documentSchema);
