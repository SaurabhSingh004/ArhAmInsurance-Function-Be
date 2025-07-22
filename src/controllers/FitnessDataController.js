// FitnessDataController.js (Converted)
const FitnessService = require('../services/FitnessDataService');
const GoogleHealthSyncService = require('../services/GoogleHealthSyncService');
const AppleHealthSyncService = require('../services/AppleHealthSyncService');
const moment = require('moment');
const { logError } = require('../utils/logError');

class FitnessController {
    
    syncGoogleFitData = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const { hr, steps, sleep, oxygen, isAppleHealth } = await request.json() || {};
            context.log("...", steps);
            
            if (!hr && !steps && !sleep && !oxygen) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'At least one data type is required'
                    }
                };
            }
            
            let syncResult = null;
            if (isAppleHealth) {
                syncResult = await AppleHealthSyncService.syncAppleHealthData(userId, hr, steps, sleep, oxygen);
            } else {
                syncResult = await GoogleHealthSyncService.syncGoogleFitData(userId, hr, steps, sleep, oxygen);
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: isAppleHealth ? 'Apple Health data synced successfully' : 'Google Health data synced successfully',
                    data: syncResult.data
                }
            };
        } catch (error) {
            context.error('Sync Error:', error);
            const err = logError('syncGoogleFitData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to sync Google Fit data',
                    error: err.message
                }
            };
        }
    }

    getFitnessData = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const { range = '30d', type } = request.query || {};

            context.log('Request received:', {
                userId: userId.toString(),
                range,
                type
            });

            let data;
            switch (type) {
                case 'steps':
                    data = await FitnessService.getStepsData(userId, range);
                    break;
                case 'heartrate':
                    data = await FitnessService.getHeartRateData(userId, range);
                    break;
                case 'sleep':
                    data = await FitnessService.getSleepData(userId, range);
                    break;
                case 'water':
                    data = await FitnessService.getWaterData(userId, range);
                    break;
                case 'respiratory':
                    data = await FitnessService.getRespiratoryData(userId, range);
                    break;
                default:
                    return {
                        status: 400,
                        jsonBody: {
                            success: false,
                            message: 'Invalid data type requested'
                        }
                    };
            }

            const { startDate, endDate } = FitnessService.getDateRange(range);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data,
                    dateRange: {
                        from: moment(startDate).format('YYYY-MM-DD'),
                        to: moment(endDate).format('YYYY-MM-DD')
                    },
                    range
                }
            };
        } catch (error) {
            context.error('Error in getFitnessData:', error);
            const err = logError('getFitnessData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Internal server error'
                }
            };
        }
    }

    addWaterEntry = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const { amount, type, operation } = await request.json() || {};

            // Validate required fields
            if (!amount || amount <= 0) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Valid amount is required'
                    }
                };
            }

            // Validate type if provided
            if (type && !['WATER', 'COFFEE', 'TEA', 'OTHER'].includes(type)) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Invalid drink type'
                    }
                };
            }

            const result = await FitnessService.updateWaterEntry(userId, { amount: amount }, operation);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result
                }
            };

        } catch (error) {
            context.error('Error in addWaterEntry controller:', error);
            const err = logError('addWaterEntry', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Internal server error'
                }
            };
        }
    }

    getRecentReports = async (request, context) => {
        try {
            const userId = context.user?._id;

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            context.log('Request received:', {
                userId: userId.toString(),
            });

            const reports = await FitnessService.getRecentReports(userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: reports
                }
            };
        } catch (error) {
            context.error('Error in getRecentReports:', error);
            const err = logError('getRecentReports', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Internal server error'
                }
            };
        }
    }
}

module.exports = new FitnessController();