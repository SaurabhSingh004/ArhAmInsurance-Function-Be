const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const wellnessModel = new Schema({
    userId: { type: String, required: true },
    wellnessScore: { type: Number },
    physScore: { type: Number },
    bodyScore: { type: Number },
    sleepScore: { type: Number },
    faceScanScore: { type: Number },
    prevFaceScanScore: { type: Number },
    heartHealthScore: { type: Number },
    dietNutritionScore: { type: Number },
    exerciseMetricsScore: { type: Number },
    prevWellnessScore: { type: Number },
    prevPhysScore: { type: Number },
    prevBodyScore: { type: Number },
    prevSleepScore: { type: Number },
    prevHeartHealthScore: { type: Number },
    prevDietNutritionScore: { type: Number },
    prevExerciseMetricsScore: { type: Number }
});

module.exports = mongoose.model('wellnessData', wellnessModel, 'wellnessData');