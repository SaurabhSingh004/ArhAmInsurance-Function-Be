const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const faceScanVitalSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    
    // ============ VITAL SIGNS ============
    video_link: {
        type: String
    },
    // Basic vitals
    heart_rate: {
        type: Number
    },
    respiratory_rate: {
        type: Number
    },
    
    // SpO2 and Blood Pressure data
    spo2: {
        type: Number
    },
    bp_systolic: {
        type: Number
    },
    bp_diastolic: {
        type: Number
    },
    
    // ============ ADVANCED HEALTH PREDICTIONS ============
    
    // AAFMA (Atrial Fibrillation) Risk Assessment
    aafma_risk: {
        type: Number
    },
    aafma_probability: {
        type: Number
    },
    aafma_category: {
        type: String
    },
    aafma_confidence: {
        type: Number
    },
    
    // Cholesterol Assessment
    cholesterol_level: {
        type: Number
    },
    cholesterol_category: {
        type: String
    },
    cholesterol_confidence: {
        type: Number
    },
    
    // Diabetes Assessment
    diabetes_category: {
        type: String
    },
    diabetes_risk: {
        type: Number
    },
    hba1c_estimated: {
        type: Number
    },
    diabetes_confidence: {
        type: Number
    },
    
    // Overall Cardiovascular Risk
    overall_cardiovascular_risk: {
        type: Number
    },
    
    // ============ SCAN METADATA ============
    
    scan_status: {
        type: String,
        default: 'completed',
        index: true
    },
    scan_errors: [{
        type: String,
        maxlength: 500
    }],
    scan_quality_score: {
        type: Number
    },
    scan_duration: {
        type: Number
    },
    device_info: {
        platform: String,
        camera_resolution: String,
        lighting_conditions: String
    }
}, {
    timestamps: true,
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.__v;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// ============ VIRTUAL FIELDS ============

// Blood pressure virtual
faceScanVitalSchema.virtual('bloodPressure').get(function() {
    if (this.bp_systolic && this.bp_diastolic) {
        return { systolic: this.bp_systolic, diastolic: this.bp_diastolic };
    }
    return null;
});

// Computed health metrics
faceScanVitalSchema.virtual('riskLevel').get(function() {
    if (this.overall_cardiovascular_risk) {
        if (this.overall_cardiovascular_risk < 10) return 'Low';
        if (this.overall_cardiovascular_risk < 20) return 'Moderate';
        if (this.overall_cardiovascular_risk < 40) return 'High';
        return 'Very High';
    }
    return 'Unknown';
});

faceScanVitalSchema.virtual('healthScore').get(function() {
    // Calculate composite health score from available metrics
    let score = 0;
    let factors = 0;
    
    // Heart rate score (60-100 optimal)
    if (this.heart_rate) {
        score += this.heart_rate >= 60 && this.heart_rate <= 100 ? 25 : Math.max(0, 25 - Math.abs(this.heart_rate - 80) * 0.5);
        factors++;
    }
    
    // Blood pressure score
    if (this.bp_systolic && this.bp_diastolic) {
        const bpScore = (this.bp_systolic < 120 && this.bp_diastolic < 80) ? 25 : Math.max(0, 25 - (this.bp_systolic - 120) * 0.2 - (this.bp_diastolic - 80) * 0.3);
        score += bpScore;
        factors++;
    }
    
    // SpO2 score (>95% optimal)
    if (this.spo2) {
        score += this.spo2 >= 95 ? 25 : Math.max(0, this.spo2 - 70);
        factors++;
    }
    
    // Risk factors penalty
    if (this.overall_cardiovascular_risk) {
        score += Math.max(0, 25 - this.overall_cardiovascular_risk * 0.6);
        factors++;
    }
    
    return factors > 0 ? Math.round(score / factors) : 0;
});

// ============ INDEXES ============

// Primary indexes
faceScanVitalSchema.index({ userId: 1, createdAt: -1 });
faceScanVitalSchema.index({ userId: 1, scan_status: 1 });

// Analytics indexes
faceScanVitalSchema.index({ userId: 1, 'createdAt': -1, 'overall_cardiovascular_risk': 1 });
faceScanVitalSchema.index({ userId: 1, 'aafma_category': 1, 'createdAt': -1 });
faceScanVitalSchema.index({ 'createdAt': 1 }, { expireAfterSeconds: 31536000 }); // Auto-delete after 1 year

// ============ INSTANCE METHODS ============

// Method to get health summary
faceScanVitalSchema.methods.getHealthSummary = function() {
    return {
        vitals: {
            heart_rate: this.heart_rate,
            respiratory_rate: this.respiratory_rate,
            spo2: this.spo2,
            blood_pressure: {
                systolic: this.bp_systolic,
                diastolic: this.bp_diastolic
            }
        },
        risks: {
            cardiovascular: this.overall_cardiovascular_risk,
            aafma: this.aafma_category,
            diabetes: this.diabetes_category,
            cholesterol: this.cholesterol_category
        },
        confidence: {
            aafma: this.aafma_confidence,
            diabetes: this.diabetes_confidence,
            cholesterol: this.cholesterol_confidence
        },
        scores: {
            health_score: this.healthScore,
            risk_level: this.riskLevel
        }
    };
};

// ============ STATIC METHODS ============

// Find users with high cardiovascular risk
faceScanVitalSchema.statics.findHighRiskUsers = function(riskThreshold = 20) {
    return this.find({
        overall_cardiovascular_risk: { $gte: riskThreshold },
        scan_status: 'completed',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).sort({ overall_cardiovascular_risk: -1 });
};

// Get analytics data for a user
faceScanVitalSchema.statics.getUserAnalytics = function(userId, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return this.aggregate([
        {
            $match: {
                userId: userId.toString(),
                createdAt: { $gte: startDate },
                scan_status: 'completed'
            }
        },
        {
            $group: {
                _id: null,
                avgHeartRate: { $avg: '$heart_rate' },
                avgSpO2: { $avg: '$spo2' },
                avgSystolic: { $avg: '$bp_systolic' },
                avgDiastolic: { $avg: '$bp_diastolic' },
                avgCardiovascularRisk: { $avg: '$overall_cardiovascular_risk' },
                scanCount: { $sum: 1 },
                latestScan: { $max: '$createdAt' }
            }
        }
    ]);
};

// ============ MIDDLEWARE ============

// Post-save hook for analytics
faceScanVitalSchema.post('save', function(doc) {
    // Could trigger analytics updates, notifications, etc.
    if (doc.overall_cardiovascular_risk > 30) {
        console.log(`High cardiovascular risk detected for user ${doc.userId}: ${doc.overall_cardiovascular_risk}%`);
    }
});

module.exports = mongoose.model('faceScanVital', faceScanVitalSchema);