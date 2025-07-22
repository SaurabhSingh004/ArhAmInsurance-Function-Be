const mongoose = require('mongoose');

const medicalConditionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [
            'Diabetes',
            'Hypertension',
            'Thyroid',
            'PCOS/PCOD',
            'Heart Disease',
            'Joint Pain',
            'Mental Health (Anxiety/Stress)',
            'Digestive Issues',
            'Other'
        ],
        required: true
    },
    severity: {
        type: String,
        enum: ['Mild', 'Moderate', 'Severe'],
        default: 'Moderate'
    },
    medications: [{
        name: String,
        dosage: String,
        frequency: String
    }],
    diagnosedDate: {
        type: Date
    },
    notes: String,
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Create indexes for better query performance
medicalConditionSchema.index({ userId: 1, type: 1 });

const MedicalCondition = mongoose.model('MedicalCondition', medicalConditionSchema);
module.exports = MedicalCondition;