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
    phoneNumber: {
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
        unique: false // Since we may rely on providerUserId instead of email
    },
    appleUniqueId: {
        type: String, // Store Apple "sub" value from identityToken
        required: function () {
            return !this.email; // If email is not available, appleUniqueId becomes mandatory
        }
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
    applicationCode: {
        type: String,
        default: 'ArihamInsurance'
    },
    auth: authSchema,
    profile: profileSchema,
    healthGoals: {
        type: Schema.Types.ObjectId,
        ref: 'userGoals'
    },
    isGoalsResponded: {
        type: Boolean,
        default: false
    },
    isMedicationResponded: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    walletId: {
        type: Schema.Types.ObjectId,
        ref: 'wallet'
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
    // NEW FIELDS ADDED WITH DEFAULT TRUE
    isHealthConnect: {
        type: Boolean,
        default: true
    },
    isATCoach: {
        type: Boolean,
        default: true
    },
    isWorkout: {
        type: Boolean,
        default: false
    },
    isFoodScan: {
        type: Boolean,
        default: true
    },
    isGenerateDiet: {
        type: Boolean,
        default: true
    },
    isSOS: {
        type: Boolean,
        default: true
    },
    isSRT: {
        type: Boolean,
        default: true
    },
    isUploadBloodTestReport: {
        type: Boolean,
        default: true
    },
    // END OF NEW FIELDS
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
    createdFrom: {
        type: String,
        default: "ARCHEL"
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

module.exports = mongoose.model('users', userSchema);
