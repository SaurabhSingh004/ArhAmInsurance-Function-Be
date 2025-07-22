const wellnessService = require('../services/WellnessService');
const {logError} = require('../utils/logError');

class WellnessController {

    saveWellnessScore = async (request, context) => {
        try {
            // Try to get user from both possible properties
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }
            
            const result = await wellnessService.saveWellnessScore(userId);
            return {
                status: 200,
                jsonBody: result
            };
        } catch (error) {
            context.log("Controller error:", error);
            const err = logError('saveWellnessScore', error, { userId: await request.json()?.userId });
            return {
                status: 400,
                jsonBody: { message: err.message }
            };
        }
    }

    getWellnessScore = async (request, context) => {
        try {
            
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }
            
            const result = await wellnessService.getUserWellnessScore(userId);
            return {
                status: 200,
                jsonBody: result
            };
        } catch (error) {
            const err = logError('getWellnessScore', error, { userId: request.query?.userId });
            return {
                status: 400,
                jsonBody: { message: err.message }
            };
        }
    }

    getDetailedWellnessScore = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const result = await wellnessService.getDetailedWellnessScore(userId);
            return {
                status: 200,
                jsonBody: result
            };
        } catch (error) {
            const err = logError('getDetailedWellnessScore', error, { userId: request.query?.userId });
            return {
                status: 400,
                jsonBody: { message: err.message }
            };
        }
    }
}

// Export the controller class
module.exports = new WellnessController();