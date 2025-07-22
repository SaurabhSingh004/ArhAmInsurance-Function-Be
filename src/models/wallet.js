const mongoose = require('mongoose');

// Reward Wallet Schema
const walletSchema = new mongoose.Schema(
    {
        balance: {
            type: Number,
            default: 0,
            required: true,
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

// Create the Wallet model
module.exports = mongoose.model('wallet', walletSchema);


