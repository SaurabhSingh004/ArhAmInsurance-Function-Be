// models/medicalExpense.js
const mongoose = require('mongoose');

const medicalExpenseSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'users', 
        required: true 
    },
    title: { 
        type: String, 
        required: true,
        trim: true
    },
    description: { 
        type: String,
        trim: true
    },
    amount: { 
        type: Number, 
        required: true,
        min: [0, 'Amount must be positive']
    },
    currency: { 
        type: String, 
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD']
    },
    expenseDate: { 
        type: Date, 
        required: true,
        default: Date.now
    },
    category: {
        type: String,
        enum: [
            'consultation', 
            'medication', 
            'lab_tests', 
            'imaging', 
            'surgery', 
            'hospitalization', 
            'emergency', 
            'dental', 
            'vision', 
            'therapy', 
            'preventive_care',
            'medical_equipment',
            'insurance_premium',
            'other'
        ],
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'bank_transfer', 'insurance', 'cheque', 'online', 'other'],
        default: 'cash'
    },
    provider: {
        name: { type: String, trim: true },
        type: { 
            type: String, 
            enum: ['hospital', 'clinic', 'pharmacy', 'lab', 'specialist', 'dentist', 'other'],
            default: 'other'
        },
        location: { type: String, trim: true },
        contactNumber: { type: String, trim: true }
    },
    notes: { 
        type: String,
        trim: true
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
medicalExpenseSchema.index({ userId: 1, expenseDate: -1 });
medicalExpenseSchema.index({ userId: 1, category: 1 });
medicalExpenseSchema.index({ userId: 1, status: 1 });
medicalExpenseSchema.index({ expenseDate: 1 });

// Virtual for formatted amount
medicalExpenseSchema.virtual('formattedAmount').get(function() {
    return `${this.currency} ${this.amount.toLocaleString()}`;
});

// Virtual for expense age
medicalExpenseSchema.virtual('expenseAge').get(function() {
    const now = new Date();
    const diffTime = Math.abs(now - this.expenseDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

module.exports = mongoose.model('MedicalExpense', medicalExpenseSchema);