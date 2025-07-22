// models/SubAccount.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Copy of only the profile‐related fields from your existing profileSchema
const subProfileSchema = new Schema({
  email:        { type: String, required: false }, // Remove unique constraint - we'll handle it manually
  countryCode: { type: String, required: false },
  firstName:    { type: String },
  lastName:     { type: String },
  dateOfBirth:  { type: String },
  gender:       { type: String },
  age:          { type: Number },
  phoneNumber:  { type: Number },
  profilePhoto: { type: String },
  bannerPhoto:  { type: String },
  height:       { type: String },  // In cm
  targetWeight: { type: String },  // In cm
  weight:       { type: String },  // In Kg
  height_unit:  { type: String },
  weight_unit:  { type: String },
  isAthlete:    { type: Boolean, default: false },
}, { _id: false }); // no separate _id for the embedded profile

const subAccountSchema = new Schema({
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'deviceusers',
    required: true
  },
  modeSelection: {
    type: String,
    enum: [
      'Baby Mode',
      'Toddler Mode',
      'Child Mode',
      'Teen Mode',
      'Standard Mode',
      'Athlete Mode'
    ],
    required: true,
    default: 'Standard Mode'
  },
  profile: {
    type: subProfileSchema,
    required: true
  }
}, {
  timestamps: true
});

// Custom validation to ensure either email or phone is provided
subAccountSchema.pre('save', function(next) {
  if (!this.profile.email && !this.profile.phoneNumber) {
    const error = new Error('Either email or phone must be provided');
    return next(error);
  }
  next();
});

// Custom validation for email uniqueness - only check if email has a value
subAccountSchema.pre('save', async function(next) {
  // Only validate email uniqueness if email is provided and not empty
  if (this.profile.email && this.profile.email.trim() !== '') {
    const existingSubAccount = await this.constructor.findOne({
      'profile.email': this.profile.email,
      _id: { $ne: this._id } // Exclude current document for updates
    });
    
    if (existingSubAccount) {
      const error = new Error('Email address already exists');
      return next(error);
    }
  }
  next();
});

// Custom validation for phone uniqueness - only check if phone has a value
subAccountSchema.pre('save', async function(next) {
  // Only validate phone uniqueness if phone is provided and not empty
  if (this.profile.phoneNumber && this.profile.phoneNumber !== 0) {
    const existingSubAccount = await this.constructor.findOne({
      'profile.phoneNumber': this.profile.phoneNumber,
      _id: { $ne: this._id } // Exclude current document for updates
    });
    
    if (existingSubAccount) {
      const error = new Error('Phone number already exists');
      return next(error);
    }
  }
  next();
});

// Alternative: You can also add validation at the schema level
subAccountSchema.path('profile').validate(function(profile) {
  return profile.email || profile.phone;
}, 'Either email or phone must be provided');

// Create indexes manually for better performance (optional)
subAccountSchema.index({ 'profile.email': 1 }, { 
  unique: true, 
  sparse: true,
  background: true 
});

subAccountSchema.index({ 'profile.phone': 1 }, { 
  unique: true, 
  sparse: true,
  background: true 
});

module.exports = mongoose.model('SubAccount', subAccountSchema);