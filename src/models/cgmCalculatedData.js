const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cgmCalculatedDataSchema = new Schema({
        userId: {
            type: Schema.Types.ObjectId,
              ref: 'users'
        },
        metabolicScore: {
            type: Number
        },
        prevDayMetabolicScoreDiff: {
            type: Number
        },
        glucoseVariability: {
            type: Number
        },
        avgGlucose: {
            type: Number
        },
        timeInTarget: {
            type: Number
        },
        hyperGlyceria: {
            type: Number
        },
        hyperGlyceriaTime:{
            type: Number
        },
        hypoGlyceria: {
            type: Number
        },
        hypoGlyceriaTime:{
            type: Number
        },
        focus: {
            type: Number
        },
        athletic: {
            type: Number
        },
        longevity: {
            type: Number
        },
        glucoseRush:{
            type: Number
        },
        glucoseDrops:{
            type: Number
        },
        cgmDataCount: {
            type: Number
        },
        graph: {
            type: {}
        },
        events: {
            type: []
        },
        unknownEventsDetected: {
            type: []
        },
        activity: {
            type: []
        },
        spikeBeans: {
            type: {}
        },
        crashBeans: {
            type: {}
        },
        circadianFactor: {
            type: Number
        },
        percentageInTarget: {
            type: Number
        },
        timeInTargetScore: {
            type: Number
        },
        avgGlucoseScore: {
            type: Number
        },
        glucoseVariabilityScore: {
            type: Number
        },
        glucoseVariabilityPer: {
            type: Number
        },
        date: {
            type: String
        },
        // goal:{
        //     type: Object
        // },
    }
);

module.exports = mongoose.model('cgmCalculatedData', cgmCalculatedDataSchema);