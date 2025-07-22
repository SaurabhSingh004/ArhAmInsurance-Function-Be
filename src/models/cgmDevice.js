const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cgmDeviceSchema = new Schema({
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
            required: true
        },
        sensor_id: {
            required: true,
            type: String
        },
        activationTime: {
            type: Number
        },
        latestReading: {
            timestamp: {
                type: Number,
                default: null
            },
            value: {
                type: Number,
                default: null
            }
        },
        manualGlucoseReadingCount: {
            type: Number
        },
        sensorData: {
            type: Object,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }
);

// Middleware to update latestReading whenever sensorData is modified
cgmDeviceSchema.pre('save', function(next) {
    // Update updatedAt timestamp
    this.updatedAt = Date.now();

    // Update latestReading if sensorData is modified
    if (this.isModified('sensorData') && Object.keys(this.sensorData).length > 0) {
        // Get the latest timestamp
        const timestamps = Object.keys(this.sensorData).map(Number);
        const latestTimestamp = Math.max(...timestamps);
        
        // Update latestReading
        this.latestReading = {
            timestamp: latestTimestamp,
            value: parseFloat(this.sensorData[latestTimestamp])
        };
    }
    
    next();
});

cgmDeviceSchema.pre('findOneAndUpdate', async function(next) {
    const update = this.getUpdate();
    
    // Check if sensorData is being modified
    if (update.$set && Object.keys(update.$set).some(key => key.startsWith('sensorData.'))) {
        // Get the document that will be updated
        const docToUpdate = await this.model.findOne(this.getQuery());
        
        if (docToUpdate) {
            // Get the updated sensorData
            const updatedSensorData = {
                ...docToUpdate.sensorData,
                ...Object.keys(update.$set)
                    .filter(key => key.startsWith('sensorData.'))
                    .reduce((acc, key) => {
                        const timestamp = key.replace('sensorData.', '');
                        acc[timestamp] = update.$set[key];
                        return acc;
                    }, {})
            };

            // Find the latest timestamp
            const timestamps = Object.keys(updatedSensorData).map(Number);
            const latestTimestamp = Math.max(...timestamps);

            // Add latestReading update to the existing update operation
            this.set({
                'latestReading': {
                    timestamp: latestTimestamp,
                    value: parseFloat(updatedSensorData[latestTimestamp])
                },
                'updatedAt': Date.now()
            });
        }
    }
    
    next();
});

module.exports = mongoose.model('cgmDevice', cgmDeviceSchema);
