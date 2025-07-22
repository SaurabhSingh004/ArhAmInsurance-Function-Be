const DietPageService = require('../services/DietpageService');
const { logError } = require('../utils/logError');

class DietPageController {

    getTodaysDietPage = async (request, context) => {
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

            const { date } = request.params || {};

            if (!date) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Date parameter is required'
                    }
                };
            }

            const result = await DietPageService.getTodaysDietPage(userId, date);

            if (!result) {
                return {
                    status: 200,
                    jsonBody: {
                        success: false,
                        message: 'No DietPage Data Found.'
                    }
                };
            } else {
                return {
                    status: 200,
                    jsonBody: {
                        success: true,
                        data: result,
                        message: 'DietPage retrieved successfully'
                    }
                };
            }
        } catch (error) {
            const err = logError('getTodaysDietPage', error, {
                userId: context.user?._id,
                date: request.params?.date
            });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new DietPageController();
