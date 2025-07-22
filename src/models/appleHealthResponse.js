const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const appleHealthResponse = new Schema({
    userId: {type: String, required: true},
    data: {type: Object}
});

module.exports = mongoose.model('appleHealthResponse', appleHealthResponse);
