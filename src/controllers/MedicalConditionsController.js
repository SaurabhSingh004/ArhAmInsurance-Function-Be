const medicalConditionService = require('../services/MedicalConditionsService');
const {logError} = require('../utils/logError');

class MedicalConditionController {

    addConditions = async (request, context) => {
        try {
            const { conditions } = await request.json() || {};

            if (!Array.isArray(conditions) || conditions.length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        error: "Invalid input. 'conditions' array is required."
                    }
                };
            }

            const result = await medicalConditionService.addConditions(conditions);
            
            return {
                status: 201,
                jsonBody: {
                    message: "Medical conditions successfully recorded.",
                    data: result
                }
            };
        } catch (error) {
            const err = logError('addConditions', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    error: err.message || "An error occurred while saving medical conditions."
                }
            };
        }
    }

    getMedicalConditions = async (request, context) => {
        try {
            const result = await medicalConditionService.getMedicalConditions();
            
            return {
                status: 200,
                jsonBody: { 
                    success: true,
                    data: result
                }
            };
        } catch (error) {
            const err = logError('getMedicalConditions', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    error: "An error occurred while fetching medical conditions.",
                    details: err.message
                }
            };
        }
    }

    updateCondition = async (request, context) => {
        try {
            const { conditionId } = request.params || {};
            const updates = await request.json() || {};

            if (!conditionId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: "conditionId is required."
                    }
                };
            }

            const result = await medicalConditionService.updateCondition(conditionId, updates);
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: "Medical condition successfully updated.",
                    data: result
                }
            };
        } catch (error) {
            const err = logError('updateCondition', error, { userId: context.user?._id });
            const statusCode = err.message === 'Medical condition not found' ? 404 : 500;
            return {
                status: statusCode,
                jsonBody: {
                    success: false,
                    error: "An error occurred while updating the medical condition.",
                    details: err.message
                }
            };
        }
    }

    deleteCondition = async (request, context) => {
        try {
            const { conditionId } = request.params || {};

            if (!conditionId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: "conditionId is required."
                    }
                };
            }

            const result = await medicalConditionService.deleteCondition(conditionId);
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: "Medical condition successfully deleted.",
                    data: result
                }
            };
        } catch (error) {
            const err = logError('deleteCondition', error, { userId: context.user?._id });
            const statusCode = err.message === 'Medical condition not found' ? 404 : 500;
            return {
                status: statusCode,
                jsonBody: {
                    success: false,
                    error: "An error occurred while deleting the medical condition.",
                    details: err.message
                }
            };
        }
    }

    getActiveConditions = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const result = await medicalConditionService.getActiveConditions(userId);
            
            return {
                status: 200,
                jsonBody: { 
                    success: true,
                    data: result
                }
            };
        } catch (error) {
            const err = logError('getActiveConditions', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    error: "An error occurred while fetching active medical conditions.",
                    details: err.message
                }
            };
        }
    }

    getConditionsByType = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { type } = request.params || {};

            if (!type) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: "Condition type is required."
                    }
                };
            }

            const result = await medicalConditionService.getConditionsByType(userId, type);
            
            return {
                status: 200,
                jsonBody: { 
                    success: true,
                    data: result
                }
            };
        } catch (error) {
            const err = logError('getConditionsByType', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    error: "An error occurred while fetching conditions by type.",
                    details: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new MedicalConditionController();