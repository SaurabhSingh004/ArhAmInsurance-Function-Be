const AppleHealthResponse = require('../models/appleHealthResponse');
const mongoose = require('mongoose');
const { logError } = require('../utils/logError');

class AppleHealthService {
    static async saveHealthData(userId, healthData) {
        try {
            // Validate userId
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID');
            }

            // Check if health data already exists for this user
            const existingData = await AppleHealthResponse.findOne({ userId });

            if (existingData) {
                // If data exists, update it
                const updatedData = await AppleHealthResponse.findOneAndUpdate(
                    { userId },
                    { $set: { data: healthData } },
                    { new: true }
                );

                return updatedData;
            } else {
                // Create new health data record
                const newHealthData = await AppleHealthResponse.create({
                    userId,
                    data: healthData
                });

                return newHealthData;
            }
        } catch (error) {
            throw logError('saveHealthData', error, { userId });
        }
    }

    static async getHealthData(userId) {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID');
            }

            const healthData = await AppleHealthResponse.findOne({ userId });
            return healthData;
        } catch (error) {
            throw logError('getHealthData', error, { userId });
        }
    }

    static async updateHealthData(userId, healthData) {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID');
            }

            const updatedData = await AppleHealthResponse.findOneAndUpdate(
                { userId },
                { $set: { data: healthData } },
                { new: true, upsert: true }
            );

            if (!updatedData) {
                throw new Error('Failed to update Apple Health data');
            }

            return updatedData;
        } catch (error) {
            throw logError('updateHealthData', error, { userId });
        }
    }

    static async deleteHealthData(userId) {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID');
            }

            const result = await AppleHealthResponse.findOneAndDelete({ userId });
            if (!result) {
                throw new Error('Apple Health data not found for this user');
            }

            return result;
        } catch (error) {
            throw logError('deleteHealthData', error, { userId });
        }
    }

    static async getAllUsersHealthData() {
        try {
            const healthData = await AppleHealthResponse.find()
                .select('-__v')
                .populate('userId', 'email profile');

            return healthData;
        } catch (error) {
            throw logError('getAllUsersHealthData', error);
        }
    }
}

module.exports = AppleHealthService;
