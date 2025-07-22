const mongoose = require('mongoose');
const { Schema } = require("mongoose");

const authSchema = new mongoose.Schema({
    provider: {
        type: String,
        enum: ['email', 'google', 'apple', 'meta'],
        required: true
    },
    providerUserId: {
        type: String, // Store Apple unique ID (sub from JWT) if email is hidden
        required: false
    },
    providerId: {
        type: String,
        required: false
    },
    idToken: {
        type: String,
        required: false
    },
    accessToken: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String,
        required: false
    },
    tokenExpiry: {
        type: Date,
        required: false
    },
    lastLogin: {
        type: Date,
        required: false
    },
    isVerified: {
        type: Boolean
    }
}, { _id: false });

const profileSchema = new mongoose.Schema({
    firebaseId: {
        type: String
    },
    firstName: {
        type: String
    },
    lastName: {
        type: String,
    },
    dateOfBirth: {
        type: String,
    },
    gender: {
        type: String,
    },
    age: {
        type: Number,
    },
    profilePhoto: {
        type: String,
    },
    bannerPhoto: {
        type: String
    },
    height: {
        type: String // In cm
    },
    weight: {
        type: String // In Kg
    },
    height_unit: {
        type: String
    },
    weight_unit: {
        type: String
    },
    isAthlete: {
        type: Boolean,
        default: false
    },
    address: {
        type: String
    },
    state: {
        type: String
    },
    district: {
        type: String
    },
    pincode: {
        type: Number
    },
    country: {
        type: String
    },
    countryCode: {
        type: String
    },
    landmark: {
        type: String
    },
}, { _id: false }); // Disable _id for subdocuments

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: false, // Changed to false since email may not be available for Apple Sign-In
        unique: true // Since we may rely on providerUserId instead of email
    },
    phoneNumber: {
        type: String,
        required: false, // Phone number may not be available for all users
        unique: true // Ensure phone number is unique across users
    },
    appleUniqueId: {
        type: String,
    },
    password: {
        type: String,
        required: false
    },
    // Email verification fields
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String
    },
    emailVerificationExpires: {
        type: Date
    },
    // Phone verification fields
    phoneVerified: {
        type: Boolean,
        default: false
    },
    phoneVerificationCode: {
        type: String
    },
    phoneVerificationExpires: {
        type: Date
    },
    medicalConditions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MedicalCondition',
        required: false
    }],
    auth: authSchema,
    profile: profileSchema,
    isGoalsResponded: {
        type: Boolean,
        default: false
    },
    isMedicationResponded: {
        type: Boolean,
        default: false
    },
    isAdmin:{
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    couponCode: {
        type: String,
        required: false
    },
    couponLabel: {
        type: String,
        required: false
    },
    couponDiscount: {
        type: Number,
        required: false
    },
    subscriptionPaymentAmount: {
        type: Number,
        required: false
    },
    isSubscribed: {
        type: Boolean,
        required: false,
        default: false
    },
    isSubscribedOnActofitDevice: {
        type: Boolean,
        required: false,
        default: false
    },
    SubscriptionDate: {
        type: Date,
        required: false
    },
    subscriptionTransactionId: {
        type: String
    },
    workoutId: {
        type: Schema.Types.ObjectId,
        ref: 'workoutPlan'
    },
    isPharmacy: {
        type: Boolean,
        default: false
    },
    isBloodTest: {
        type: Boolean,
        default: false
    },
    isInsurance: {
        type: Boolean,
        default: false
    },
    isOfflineAccount: {
        type: Boolean,
        default: false
    },
    pendingDeletion: {
        type: Boolean,
        default: false
    },
    deletionRequestDate: {
        type: Date
    },
    scheduledDeletionDate: {
        type: Date
    },
    resetPasswordToken: {
        type: String,
    },
    resetPasswordExpire: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save middleware to update auth.isVerified based on email and phone verification
userSchema.pre('save', function(next) {
    // Only update auth.isVerified if both email and phone verification fields exist
    if (this.emailVerified !== undefined && this.phoneVerified !== undefined && this.auth) {
        this.auth.isVerified = this.emailVerified && this.phoneVerified;
    }
    next();
});

module.exports = mongoose.model('deviceusers', userSchema);
