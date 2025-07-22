const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Task Schema
const taskSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  points: {
    type: Number,
    required: true,
    min: 0
  },
  featureType: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  screen:{
    type: String
  },
  tab:{
    type: String
  }
});

taskSchema.index({ type: 1, isActive: 1 });

taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});


const Task = mongoose.model('Task', taskSchema);

module.exports = Task;