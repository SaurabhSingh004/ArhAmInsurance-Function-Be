const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const faceScanVitalSchema = new Schema({
        userId: {
            required: true,
            type: String
        },
        ibi: {
            type: Number
        },
        rmssd: {
            type: Number
        },
        sdnn: {
            type: Number
        },
        bpm: {
            type: Number
        },
        rr: {
            type: Number
        },
        oxygen: {
            type: Number
        },
        systolic: {
            type: Number
        },
        diastolic: {
            type: Number
        },
        stressStatus: {
            type: String
        },
        bloodPressureStatus: {
            type: String
        },
        bmi: {
            type: Number
        },
        co: {
            type: Number
        },
        pnn50: {
            type: Number
        },
        hu: {
            type: Number
        },
        map: {
            type: Number
        },
        asth_risk: {
            type: Number
        }
    }, {
        timestamps: true
    }
);

module.exports = mongoose.model('faceScanVital', faceScanVitalSchema);