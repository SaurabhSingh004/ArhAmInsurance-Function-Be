const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    }
}, { _id: false });

const subscriptionType = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        enum: ['pro', 'pro-plus'],
    },
    name: {
        type: String,
        required: true,
        enum: ['Pro Plan', 'Pro Plus']
    },
    price: {
        type: Number,
        required: true
    },
    isBestValue: {
        type: Boolean,
        default: false
    },
    features: [featureSchema],
    additionalInfo: {
        type: String
    }
}, { _id: false });

const couponCodeSchema = new mongoose.Schema({
    code: { 
        type: String, 
        required: true 
    },
    discount: { 
        type: Number, 
        required: true, 
        min: 0, 
        max: 100 
    }
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
    type: subscriptionType,
    period: {
        type: Date
    },
    currencyUnit: {
        type: String,
        required: true
    },
    currencySymbol: {
        type: String,
        required: true
    },
    couponCode: [couponCodeSchema],
    isSubscribed: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // This will automatically handle createdAt and updatedAt
});

// Add middleware to handle the updatedAt field
subscriptionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('subscription', subscriptionSchema);