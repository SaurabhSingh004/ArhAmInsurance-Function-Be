const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const weightProgressSchema = new Schema({
    date: {
        type: Date,
        required: true
    },
    weight: {
        type: Number,
        required: true
    },
    target:{
        type: Number,
        required: true
    },
    notes: String
}, {_id: false});


const weightGoalSchema = new Schema({
    target: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'paused', 'abandoned'],
        default: 'active'
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    points: {
        type: Number,
        default: 25
    },
    progress: [weightProgressSchema]
}, {_id: false});


const secondaryGoalSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    current: {
        type: Schema.Types.Mixed,  
        required: true
    },
    target: {
        type: Schema.Types.Mixed,  
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'paused', 'abandoned'],
        default: 'active'
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    progress: [{
        date: Date,
        value: Schema.Types.Mixed,
        notes: String
    }]
}, {_id: false});


const userGoalsSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'users',
        index: true
    },
    goals: [secondaryGoalSchema],
    dailyTargets: {
        calories: {
            type: Number,
            default: 2000
        },
        protein: {
            type: Number,
            default: 50 
        },
        carbohydrates: {
            type: Number, 
            default: 275 
        },
        fat: {
            type: Number,
            default: 65 
        },
        water: {
            type: Number,
            default: 2000 
        },
        steps: {
            type: Number,
            default: 6000
        },
        sleep: {
            type: Number,
            default: 8 
        },
        vitaminD: {
            type: Number,
            default: 600 
        },
        iron: {
            type: Number,
            default: 18 
        },
        calcium: {
            type: Number,
            default: 1000 
        }, 
        vitaminA: {
            type: Number,
            default: 900 
        },
        vitaminC: {
            type: Number,
            default: 90 
        }
     }
}, {
    timestamps: true
});

module.exports = mongoose.model('UserGoals', userGoalsSchema);