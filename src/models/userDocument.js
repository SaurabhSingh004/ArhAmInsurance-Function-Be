const mongoose = require('mongoose');

const userDocumentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fileName: {
        type: String,
    },
    documentType:{
        type: String,
        enum: ['passport', 'vaccination', 'health', 'other', 'visa']
    },
    fileUrl: {
        type: String,
    }
}, {
    timestamps: true
});

const Document = mongoose.model('userDocument', userDocumentSchema);

module.exports = Document;