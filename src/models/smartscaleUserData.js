const mongoose = require('mongoose')
const Schema = mongoose.Schema
require('mongoose-long')(mongoose)

const bodyCompositionMetricsSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    timestamp: {
        type: Number
    },
    device_type: {
        type: Number,
        enum: [0, 1, 2, 3, 4, 5, 8]
    },
    device_id: {
        type: String
    },
    gender: {
        type: String
    },
    weight: {
        type: Number
    },
    height: {
        type: Number
    },
    bmi: {
        type: Number
    },
    body_fat: {
        type: Number
    },
    physique: {
        type: Number
    },
    fat_free_weight: {
        type: Number
    },
    subcutaneous_fat: {
        type: Number
    },
    visceral_fat: {
        type: Number
    },
    body_water: {
        type: Number
    },
    skeletal_muscle: {
        type: Number
    },
    muscle_mass: {
        type: Number
    },
    bone_mass: {
        type: Number
    },
    protein: {
        type: Number
    },
    bmr: {
        type: Number
    },
    metabolic_age: {
        type: Number
    },
    right_arm_fat: {
        type: Number
    },
    right_arm_fat_kg: {
        type: Number
    },
    right_arm_muscle_mass: {
        type: Number
    },
    right_arm_muscle_mass_kg: {
        type: Number
    },
    left_arm_fat: {
        type: Number
    },
    left_arm_fat_kg: {
        type: Number
    },
    left_arm_muscle_mass: {
        type: Number
    },
    left_arm_muscle_mass_kg: {
        type: Number
    },
    right_leg_fat: {
        type: Number
    },
    right_leg_fat_kg: {
        type: Number
    },
    right_leg_muscle_mass: {
        type: Number
    },
    right_leg_muscle_mass_kg: {
        type: Number
    },
    left_leg_fat: {
        type: Number
    },
    left_leg_fat_kg: {
        type: Number
    },
    left_leg_muscle_mass: {
        type: Number
    },
    left_leg_muscle_mass_kg: {
        type: Number
    },
    trunk_fat: {
        type: Number
    },
    trunk_fat_kg: {
        type: Number
    },
    trunk_muscle_mass: {
        type: Number
    },
    trunk_muscle_mass_kg: {
        type: Number
    },
    health_score: {
        type: Number
    },
    is_athlete: {
        type: Boolean
    },
}, {
    timestamps: true
})

module.exports = mongoose.model('smartscaleUserData', bodyCompositionMetricsSchema, 'smartscaleUserData');