const FitnessService = require('../services/FitnessDataService');
const HealthPageService = require('../services/HealthPageService');
const {logError} = require('../utils/logError');

class HealthPageController {

    getHealthData = async (request, context) => {
        try {
            const user = context.user;
            
            if (!user) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const result = await HealthPageService.getHealthData(user);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Health data retrieved successfully'
                }
            };

        } catch (error) {
            // Handle specific error for missing user ID
            if (error.message === 'User ID is required') {
                const err = logError('getHealthData', error, { userId: context.user?._id });
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'User ID is required'
                    }
                };
            }

            // Handle other errors
            const err = logError('getHealthData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch health data',
                    error: err.message
                }
            };
        }
    }

    getWaterData = async (request, context) => {
        try {
            const user = context.user;
            
            if (!user) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const result = await FitnessService.getTodayWaterLog(user._id);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Water data retrieved successfully'
                }
            };

        } catch (error) {
            // Handle specific error for missing user ID
            if (error.message === 'User ID is required') {
                const err = logError('getWaterData', error, { userId: context.user?._id });
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'User ID is required'
                    }
                };
            }

            // Handle other errors
            const err = logError('getWaterData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch water data',
                    error: err.message
                }
            };
        }
    }

    getHealthInsightData = async (request, context) => {
        try {
            const user = context.user;
            
            if (!user) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const result = await HealthPageService.getHealthInsightData(user);

            // Check if any essential health data is missing
            if (!result.vitals.wellnessScore && !result.bloodTest.metrics?.length && !result.glucose.today.readings?.length) {
                return {
                    status: 200,
                    jsonBody: {
                        success: true,
                        data: result,
                        message: 'Health Insight data retrieved successfully. No health metrics found.'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Health Insight data retrieved successfully'
                }
            };

        } catch (error) {
            // Handle specific error for missing user ID
            if (error.message === 'User ID is required') {
                const err = logError('getHealthInsightData', error, { userId: context.user?._id });
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'User ID is required'
                    }
                };
            }

            // Handle other errors
            const err = logError('getHealthInsightData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch health insight data',
                    error: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new HealthPageController();