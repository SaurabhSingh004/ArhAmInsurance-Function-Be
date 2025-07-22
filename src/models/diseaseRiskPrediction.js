const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const KeyValuePairSchema = new Schema({
  key: {
    type: Schema.Types.Mixed,
    required: true,
    trim: true
  },
  value: {
    type: Boolean,
    required: true
  }
});

const DiseaseRiskPredictionSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  diseaseId:{
    type:String,
    required: true,
  },
  diseaseName: {
    type: String,
    required: true,
    trim: true
  },
  riskScoreTitle: {
    type: String,
    required: true,
  },
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  riskScoreType: {
    type: String,
    required: true,
    enum: ['Healthy','Mild' , 'Moderate', 'High', 'Critical']
  },
  last_calculation: {
    type: Date,
    default: Date.now
  },
  symptonsTracking:{
    type: [KeyValuePairSchema]
  },
  planOfAction:{
    type: Schema.Types.Mixed
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

// Export the model
module.exports = mongoose.model('DiseaseRiskPrediction', DiseaseRiskPredictionSchema);
