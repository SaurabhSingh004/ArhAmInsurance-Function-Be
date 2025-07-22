// models/SintraCapUser.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  // Basic SintraCapuser information
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  
  // Signup process tracking
  signupStatus: {
    type: String,
    enum: ['pre-signup', 'role-selected', 'complete'],
    default: 'pre-signup'
  },
  
  // Terms agreement
  agreedToTerms: {
    type: Boolean,
    required: true,
    default: false
  },
  
  // Role information
  role: {
    type: String,
    enum: ['investor', 'founder', 'admin'],
    required: function() {
      return this.signupStatus !== 'pre-signup';
    }
  },
  
  // Investor-specific fields
  interests: {
    type: [String],
    required: function() {
      return this.role === 'investor' && this.signupStatus !== 'pre-signup';
    }
  },
  investmentPreferences: {
    minAmount: {
      type: Number
    },
    maxAmount: {
      type: Number
    },
    stages: {
      type: [String]
    }
  },
  
  // Founder-specific fields
  startupName: {
    type: String,
    trim: true
  },
  startupDescription: {
    type: String,
    required: function() {
      return this.role === 'founder' && this.signupStatus !== 'pre-signup';
    }
  },
  industry: {
    type: String,
    trim: true
  },
  fundingStage: {
    type: String,
    trim: true
  },
  amountRange: {
    type: String,
    trim: true
  },
  startupCategory: {
    type: String,
    trim: true
  },
  teamSize: {
    type: Number
  },
  verifiedAt: {
    type: Date,
    required: false
  },
  isVerifiedByAdmin: {
    type: Boolean,
    default: false 
  },
  // Account status and expiry (for pre-signup)
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    required: function() {
      return this.signupStatus === 'pre-signup';
    },
    default: function() {
      if (this.signupStatus === 'pre-signup') {
        // Set expiry to 24 hours from now for pre-signup entries
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
      return null;
    }
  }
}, {
  timestamps: true
});

// Add TTL index for automatic expiration of pre-signup entries
UserSchema.index(
  { expiresAt: 1 },
  { 
    expireAfterSeconds: 0,
    partialFilterExpression: { signupStatus: 'pre-signup' }
  }
);

// Pre-save hook to hash password
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to validate password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.statics.getUsersByRole = async function (role) {
    if (!['investor', 'founder'].includes(role)) {
      throw new Error('Invalid role specified. Valid roles are "investor" and "founder".');
    }
  
    let queryFields = ['_id', 'name', 'email']; // Fields common to all roles
  
    if (role === 'investor') {
      queryFields.push('interests', 'email', 'phone', 'isVerifiedByAdmin', 'investmentPreferences', 'amountRange','signupStatus', 'createdAt', 'isActive');
    } else if (role === 'founder') {
      queryFields.push(
        'startupName',
        'startupDescription',
        'industry',
        'fundingStage',
        'amountRange',
        'teamSize',
        'signupStatus',
        'isActive',
        'createdAt',
        'isVerifiedByAdmin',
        'phone',
        'email'
      );
    }
  
    return await SintraCapUser.find({ role }).select(queryFields.join(' '));
  };

const SintraCapUser = mongoose.model('SintraCapUser', UserSchema);

module.exports = SintraCapUser;