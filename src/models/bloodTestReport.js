const mongoose = require('mongoose');

const bloodTestReportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        required: true
    },
    reportPath: {
        type: String //Stores location of blood test
    },
    metrics: [{
        name: String,
        value: Number,
        unit: String,
        status: {
            type: String
        },
        recommendation: String,
        idealRange: String
    }],
    charts: [{
        type: {
            type: String,
            enum: ['bar', 'line', 'pie']
        },
        title: String,
        data: [{
            label: String,
            value: Number
        }]
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('bloodTestReport', bloodTestReportSchema);