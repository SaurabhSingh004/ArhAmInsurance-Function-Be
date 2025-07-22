const CoachHistoryService = require('../services/CoachHistoryService');
const { logError } = require('../utils/logError');

class CoachHistoryController {

    getUserInteractions = async (request, context) => {
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

            const interactions = await CoachHistoryService.getUserInteractions(userId);

            if (!interactions || interactions.length === 0) {
                return {
                    status: 200,
                    jsonBody: {
                        success: false,
                        message: 'No interactions found',
                        data: []
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Interactions fetched successfully',
                    data: interactions
                }
            };
        } catch (error) {
            context.error('Error in getUserInteractions:', error);
            const err = logError('getUserInteractions', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error fetching interactions'
                }
            };
        }
    }

    getInteractionById = async (request, context) => {
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

            const { interactionId } = request.params || {};

            if (!interactionId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Interaction ID is required'
                    }
                };
            }

            const interaction = await CoachHistoryService.getInteractionById(interactionId, userId);

            if (!interaction) {
                return {
                    status: 200,
                    jsonBody: {
                        success: false,
                        message: 'No interaction found',
                        data: {}
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Interaction fetched successfully',
                    data: interaction
                }
            };
        } catch (error) {
            context.error('Error in getInteractionById:', error);
            const err = logError('getInteractionById', error, {
                userId: context.user?._id,
                interactionId: request.params?.interactionId
            });
            const statusCode = err.message.includes('not found') ? 404 : 500;
            return {
                status: statusCode,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error fetching interaction'
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new CoachHistoryController();
