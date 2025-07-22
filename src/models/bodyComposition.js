// models/BodyComposition.js
const mongoose = require('mongoose');

const BodyCompositionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'deviceusers',
        required: true
    },
    profileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subaccounts',
        required: true
    },
    // Basic Measurements
    weight_g: { type: Number, required: true },
    weight_kg: { type: Number, required: true },
    weight_lb: { type: Number, required: true },
    weight_st: { type: Number, required: true },
    weight_st_lb: { type: Number, required: true },

    // Precision and Scale Data
    precision_kg: { type: Number, default: 2 },
    precision_lb: { type: Number, default: 1 },
    precision_st_lb: { type: Number, default: 1 },
    kg_scale_division: { type: Number, default: 2 },
    lb_scale_division: { type: Number, default: 3 },

    // Environmental Data
    temperature: { type: Number, default: 0.0 },

    // Heart Rate
    isSupportHR: { type: Boolean, default: false },
    hr: { type: Number, default: 0 },

    // Body Composition Metrics
    bmi: { type: Number, required: true },
    bodyFatPercent: { type: Number, required: true },
    subcutaneousFatPercent: { type: Number, required: true },
    visceralFat: { type: Number, required: true },
    musclePercent: { type: Number, required: true },
    bmr: { type: Number, required: true }, // Basal Metabolic Rate
    boneMass: { type: Number, required: true },
    moisturePercent: { type: Number, required: true },
    physicalAge: { type: Number, required: true },
    proteinPercent: { type: Number, required: true },
    smPercent: { type: Number, required: true }, // Skeletal Muscle Percentage

    // Device Data
    electrode: { type: Number, default: 4 },
    bodyScore: { type: Number, required: true },
    bodyType: { type: Number, required: true },

    // Target and Control Values
    targetWeight: { type: Number, required: true },
    bfmControl: { type: Number, required: true }, // Body Fat Mass Control
    ffmControl: { type: Number, required: true }, // Fat Free Mass Control
    weightControl: { type: Number, required: true },

    // Standard Reference Values
    weightStandard: { type: Number, required: true },
    bfmStandard: { type: Number, required: true },
    bmiStandard: { type: Number, required: true },
    smmStandard: { type: Number, required: true },
    ffmStandard: { type: Number, required: true },
    bfpStandard: { type: Number, required: true },
    bmrStandard: { type: Number, required: true },

    // Range Values (Min/Max)
    bmiMax: { type: Number, required: true },
    bmiMin: { type: Number, required: true },
    bfmMax: { type: Number, required: true },
    bfmMin: { type: Number, required: true },
    bfpMax: { type: Number, required: true },
    bfpMin: { type: Number, required: true },
    weightMax: { type: Number, required: true },
    weightMin: { type: Number, required: true },
    smmMax: { type: Number, required: true },
    smmMin: { type: Number, required: true },
    boneMax: { type: Number, required: true },
    boneMin: { type: Number, required: true },
    bmrMax: { type: Number, required: true },
    bmrMin: { type: Number, required: true },
    waterMassMax: { type: Number, required: true },
    waterMassMin: { type: Number, required: true },
    proteinMassMax: { type: Number, required: true },
    proteinMassMin: { type: Number, required: true },
    muscleMassMax: { type: Number, required: true },
    muscleMassMin: { type: Number, required: true },

    // Additional Metrics
    smi: { type: Number, default: 0.0 }, // Skeletal Muscle Index
    obesityDegree: { type: Number, required: true },
    state: { type: Number, default: 0 },

    // Impedance Data
    imp: { type: Number, required: true },
    imp2: { type: Number, default: 0.0 },
    imp3: { type: Number, default: 0.0 },
    imp4: { type: Number, default: 0.0 },
    imp5: { type: Number, default: 0.0 },
    impendences: [{ type: Number }],

    // Technical Fields
    extData: { type: mongoose.Schema.Types.Mixed, default: null },
    data_calc_type: { type: Number, default: 0 },
    bfa_type: { type: String, required: true },
    impendenceType: { type: Number, default: 0 },
    impendenceProperty: { type: Number, default: 0 },

    // Stability Flag
    isStabilized: { type: Boolean, default: true },

    // Timestamp
    time: { type: Number, required: true }, // Unix timestamp
    measurementDate: { type: Date, default: Date.now, index: true },

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Compound indexes for efficient querying
BodyCompositionSchema.index({ userId: 1, measurementDate: -1 });
BodyCompositionSchema.index({ measurementDate: -1 });
BodyCompositionSchema.index({ userId: 1, time: -1 });

// Pre-save middleware to update timestamps
BodyCompositionSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    if (this.time) {
        this.measurementDate = new Date(this.time * 1000);
    }
    next();
});

module.exports = mongoose.model('BodyComposition', BodyCompositionSchema);