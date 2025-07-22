const CoachService = require('../services/CoachService');
const { logError } = require('../utils/logError');

class CoachController {

    getCoachResponse = async (request, context) => {
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
            const reqBody = await request.json();

            if (!reqBody) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Request body is required'
                    }
                };
            }

            const coachResponse = await CoachService.getCoachResponse(reqBody, userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Coach response fetched successfully',
                    data: {
                        response: coachResponse.data,
                        interaction_id: coachResponse.interactionId
                    }
                }
            };
        } catch (error) {
            context.error('Error in getCoachResponse:', error);
            const err = logError('getCoachResponse', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error getting coach response'
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new CoachController();
