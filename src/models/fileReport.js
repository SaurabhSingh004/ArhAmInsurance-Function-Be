const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    default: () => `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chatId: {
    type: String,
    required: true
  },
  reportType: {
    type: String,
    required: true,
    enum: ['spam', 'harassment', 'inappropriate', 'inaccurate', 'other', 'harmful', 'bias', 'technical']
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);