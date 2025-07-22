const mongoose = require('mongoose');
const { Schema } = mongoose;

// Steps Schema
const stepsSchema = new Schema({
  totalSteps: {
    type: Number,
    required: true,
    default: 0
  },
  stepsByHour: [{
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    steps: {
      type: Number,
      required: true,
      default: 0
    },
    distance: {
      type: Number, // in meters
      default: 0
    },
    moveMinutes: {
      type: Number,
      default: 0
    }
  }],
  // Additional metrics
  totalDistance: {
    type: Number, // in meters
    default: 0
  },
  totalMoveMinutes: {
    type: Number,
    default: 0
  },
  averageStepLength: {
    type: Number, // in meters
    default: 0
  }
});

const waterSchema = new Schema({
  entries: [{
    timestamp: {
      type: Date,
      required: true
    },
    amount: {
      type: Number, // in milliliters
      required: true
    },
    type: {
      type: String,
      enum: ['WATER', 'COFFEE', 'TEA', 'OTHER'],
      default: 'WATER'
    }
  }],
  totalIntake: {
    type: Number, // in milliliters
    required: true,
    default: 0
  },
  targetIntake: {
    type: Number, // in milliliters
    default: 2000 // Default target of 2L
  }
});

// Heart Rate Schema
const heartRateSchema = new Schema({
  readings: [{
    timestamp: {
      type: Date,
      required: true
    },
    bpm: {
      type: Number,
      required: true
    }
  }],
  averageBpm: {
    type: Number,
    required: true,
    default: 0
  }
});

// Sleep Schema
const sleepSchema = new Schema({
  sessions: [{
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    duration: {
      type: Number, // in milliseconds
      required: true
    },
    name: {
      type: String
    },
    description: {
      type: String
    }
  }],
  totalSleepDuration: {
    type: Number, // in milliseconds
    required: true,
    default: 0
  }
});

// Vitals Schema (New)
const vitalsSchema = new Schema({
  bloodPressure: {
    systolic: { type: Number, default: 0 },
    diastolic: { type: Number, default: 0 }
  },
  bodyTemperature: {
    type: Number,
    default: 0
  },
  oxygenSaturation: {
    type: Number,
    default: 0
  },
  respiratoryRate: {
    type: Number,
    default: 0
  }
});

// Add this to your schemas section
const respiratorySchema = new Schema({
  readings: [{
    timestamp: {
      type: Date,
      required: true
    },
    rate: {
      type: Number, // breaths per minute
      required: true
    },
    type: {
      type: String,
      enum: ['REST', 'ACTIVE', 'EXERCISE'],
      default: 'REST'
    },
    confidence: {
      type: Number, // confidence score of the reading (0-1)
      default: 1
    }
  }],
  averageRate: {
    type: Number,
    required: true,
    default: 0
  },
  maxRate: {
    type: Number,
    default: 0
  },
  minRate: {
    type: Number,
    default: 0
  },
  restingRate: {
    type: Number,
    default: 0
  }
});


const fitnessDataSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  syncSource: {
    type: String,
    enum: ['GOOGLE_FIT', 'APPLE_HEALTH', 'MANUAL'],
    default: 'GOOGLE_FIT'
  },
  steps: stepsSchema,
  heartRate: heartRateSchema,
  sleep: sleepSchema,
  vitals: vitalsSchema,
  water: waterSchema,
  respiratory: respiratorySchema,
  // Enhanced metadata
  metadata: {
    lastSyncTime: {
      type: Date,
      default: Date.now
    },
    syncStatus: {
      type: String,
      enum: ['SUCCESS', 'PARTIAL', 'FAILED'],
      default: 'SUCCESS'
    },
    // Additional sync details
    syncDetails: {
      dataTypes: [String],
      processedAt: Date,
      rawResponseSize: Number
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
fitnessDataSchema.index({ userId: 1, date: -1 });
fitnessDataSchema.index({ 'metadata.lastSyncTime': -1 });

// Enhanced methods
fitnessDataSchema.methods.getSummary = function() {
  return {
    totalSteps: this.steps.totalSteps,
    totalDistance: this.steps.totalDistance,
    moveMinutes: this.steps.totalMoveMinutes,
    averageHeartRate: this.heartRate.averageBpm,
    totalSleepHours: this.sleep.totalSleepDuration / (1000 * 60 * 60),
    caloriesBurned: this.steps.caloriesBurned,
    vitals: this.vitals
  };
};

// Enhanced static methods
fitnessDataSchema.statics.findLatestByUser = function(userId) {
  return this.findOne({ userId })
    .sort({ date: -1 })
    .exec();
};

fitnessDataSchema.statics.getDateRangeData = function(userId, startDate, endDate) {
  return this.find({
    userId,
    date: { $gte: startDate, $lte: endDate }
  })
  .sort({ date: 1 })
  .select('date steps heartRate sleep vitals performanceMetrics');
};

// Pre-save middleware
fitnessDataSchema.pre('save', function(next) {
  // Update last sync time
  this.metadata.lastSyncTime = new Date();
  
  // Calculate additional derived metrics
  if (this.steps) {
    this.steps.averageStepLength = this.steps.totalSteps > 0 
      ? this.steps.totalDistance / this.steps.totalSteps 
      : 0;
  }
  
  next();
});

const FitnessData = mongoose.model('FitnessData', fitnessDataSchema);
module.exports = FitnessData;