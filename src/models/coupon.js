const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },  // Unique coupon code
    isActive: { type: Boolean, default: true },  // Active status
    discount: { type: Number, required: true } , // type fixed Amount only 
    label: { type: String },  // Comments or eligibility description
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }] 
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
