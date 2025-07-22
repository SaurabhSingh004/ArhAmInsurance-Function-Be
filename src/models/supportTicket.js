const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    appName: {
        type: String,
        enum: ['ACTDEV',
        'ACTWEL',
        'ARCHEL'],
        default: 'ACTWEL',
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    emailAddress: {
        type: String,
        required: [true, 'Email address is required'],
        trim: true,
        lowercase: true,
    },
    question: {
        type: String,
        required: [true, 'Question is required'],
        trim: true,
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        minlength: [4, 'Message must be at least 10 characters long']
    },
    status: {
        type: String,
        enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED'],
        default: 'PENDING'
    },
    ticketNumber: {
        type: String,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Generate ticket number before saving
supportTicketSchema.pre('save', async function(next) {
    if (this.isNew) {
        const count = await mongoose.model('SupportTicket').countDocuments();
        this.ticketNumber = `TKT${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

module.exports = SupportTicket;