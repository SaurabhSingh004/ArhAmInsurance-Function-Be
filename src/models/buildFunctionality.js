const mongoose = require('mongoose');

const buildFunctionalitySchema = new mongoose.Schema({
    buildNumber: { type: String, required: true, unique: true },
    features: { type: mongoose.Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('BuildFunctionality', buildFunctionalitySchema);