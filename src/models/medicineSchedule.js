const mongoose = require('mongoose');

// Define Mongoose schema for medicine schedule
const medicineScheduleSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    medicines: [
        {
            name: {
                type: String,
                required: true
            },
            description: {
                type: String,
                required: false
            },
            dosage: {
                type: String,
                required: false
            },
            frequency: {
                type: String,
                enum: ['daily', 'weekly', 'monthly'],
                required: true
            },
            times:{
                morning: {
                    type: Boolean,
                    default: false,
                },
                afternoon: {
                    type: Boolean,
                    default: false,
                },
                dinner: {
                    type: Boolean,
                    default: false,
                },
            },
            taken:[
                {
                    morning_taken: {
                        type: Boolean,
                        default: false,
                    },
                    afternoon_taken: {
                        type: Boolean,
                        default: false,
                    },
                    dinner_taken: {
                        type: Boolean,
                        default: false,
                    },
                }
            ],
            duration: {
                startDate: {
                    type: Date,
                    required: true
                },
                endDate: {
                    type: Date,
                    required: true
                }
            }
        }
    ]
}, { timestamps: true });

// Create Mongoose model
const MedicineSchedule = mongoose.model('MedicineSchedule', medicineScheduleSchema);
module.exports = MedicineSchedule;