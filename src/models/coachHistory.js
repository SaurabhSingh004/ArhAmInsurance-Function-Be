const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const coachHistoryModel = new Schema({
    userId: {
        type: String,
        required: true
    },
    messages: {
        type: Array,
        required: true
    },
}, {
    timestamps: true
})

module.exports = mongoose.model('coachHistory', coachHistoryModel, 'coachHistory')