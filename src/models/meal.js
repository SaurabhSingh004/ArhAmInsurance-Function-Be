const mongoose = require('mongoose');
const Schema = mongoose.Schema

const mealSchema = new Schema({
    userId: {
        type:String,
        require: true
    },
    meal: {
        type: Schema.Types.ObjectId,
        ref: 'foods'
    },
    isCompleted: {
        type: Boolean,
        default:false
    },
    quantity: {
        type:Number,
        required: false,
        default: 1
    },
    mealHits: {type: Number},
    mealType: {
        type: String,
        enum: ['breakfast_meal', 'lunch_meal','evening_snack', 'dinner_meal']
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

// Post middleware for findOne to update only the found document
mealSchema.post('findOne', async function(doc) {
    if (doc) {
        await doc.updateOne({ 
            $inc: { mealHits: 1 },
            $set: { updatedAt: new Date() }
        });
    }
});

// Post middleware for findById to update only the found document
mealSchema.post('findById', async function(doc) {
    if (doc) {
        await doc.updateOne({ 
            $inc: { mealHits: 1 },
            $set: { updatedAt: new Date() }
        });
    }
});

// Post middleware for save to update the new document
mealSchema.post('save', async function(doc) {
    await doc.updateOne({ 
        $inc: { mealHits: 1 },
        $set: { updatedAt: new Date() }
    });
});

module.exports = mongoose.model('meals', mealSchema);