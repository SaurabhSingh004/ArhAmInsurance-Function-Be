const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  dosage: {
    type: String,
    required: true
  },
  instructions: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
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

// Update the updatedAt timestamp before saving
medicineSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Medicine = mongoose.model('Medicine', medicineSchema);
module.exports = Medicine;