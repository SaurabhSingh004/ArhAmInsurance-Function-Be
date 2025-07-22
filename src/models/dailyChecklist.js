const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title:{
        type:String,
        required: true,
    },
    name: {
        type: String,
        required: false,
        trim: true
    },
    // Will check Later
    percentageCompleted:{
        type: Number,
        required:false
    },
    isCompleted: {
        type: Boolean,
        default: false
    }
});

const dailyChecklistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tasks: [taskSchema],
    completedTasksCount: {
        type: Number,
        default: 0
    },
    totalTasksCount: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DailyChecklist', dailyChecklistSchema);