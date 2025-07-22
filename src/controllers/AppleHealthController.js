const appleHealthService = require('../services/AppleHealthService');
const {logError} = require('../utils/logError');

class AppleHealthController {

    saveHealthData = async (request, context) => {
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

            const healthData = await request.json() || {};

            const savedData = await appleHealthService.saveHealthData(userId, healthData);

            return {
                status: 201,
                jsonBody: {
                    success: true,
                    message: 'Apple Health data saved successfully',
                    data: savedData
                }
            };
        } catch (error) {
            context.error('Error in saveHealthData:', error);
            const err = logError('saveHealthData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error saving Apple Health data'
                }
            };
        }
    }

    getHealthData = async (request, context) => {
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

            const healthData = await appleHealthService.getHealthData(userId);

            if (!healthData) {
                return {
                    status: 200,
                    jsonBody: {
                        success: false,
                        message: 'No Apple Health data found for this user',
                        data: {}
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Apple Health data fetched successfully',
                    data: healthData
                }
            };
        } catch (error) {
            context.error('Error in getHealthData:', error);
            const err = logError('getHealthData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error fetching Apple Health data'
                }
            };
        }
    }

    updateHealthData = async (request, context) => {
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

            const healthData = await request.json() || {};

            const updatedData = await appleHealthService.updateHealthData(userId, healthData);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Apple Health data updated successfully',
                    data: updatedData
                }
            };
        } catch (error) {
            context.error('Error in updateHealthData:', error);
            const err = logError('updateHealthData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error updating Apple Health data'
                }
            };
        }
    }

    deleteHealthData = async (request, context) => {
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

            const deletedData = await appleHealthService.deleteHealthData(userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Apple Health data deleted successfully',
                    data: deletedData
                }
            };
        } catch (error) {
            context.error('Error in deleteHealthData:', error);
            const err = logError('deleteHealthData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error deleting Apple Health data'
                }
            };
        }
    }

    getAllUsersHealthData = async (request, context) => {
        try {
            const healthData = await appleHealthService.getAllUsersHealthData();

            if (healthData.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'No Apple Health data found'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'All users Apple Health data retrieved successfully',
                    data: healthData
                }
            };
        } catch (error) {
            const err = logError('getAllUsersHealthData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error fetching users Apple Health data',
                    error: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new AppleHealthController();
