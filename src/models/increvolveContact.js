const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Contact Schema
 * Stores contact form submissions from the website
 */
const increvolveContactSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  phone: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  service: {
    type: String,
    enum: ['', 'seo', 'social', 'ppc', 'content', 'email', 'analytics', 'web'],
    default: ''
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'read', 'in-progress', 'contacted', 'resolved'],
    default: 'new'
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

// Update the updatedAt field on save
increvolveContactSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create a text index for searching
increvolveContactSchema.index({ 
  name: 'text', 
  email: 'text', 
  message: 'text', 
  company: 'text' 
});

module.exports = mongoose.model('increvolveContact', increvolveContactSchema);