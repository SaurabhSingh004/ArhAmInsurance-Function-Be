const DiseaseRiskPredictionService = require('../services/DiseaseRiskPredictionService');
const { generateRiskAssessmentPrompt } = require('../utils/prompts/diseaseRiskPrompt');
const { logError } = require('../utils/logError');

class DiseasePredictionController {

    createRiskPredictions = async (request, context) => {
        try {
            const { condition, answers } = await request.json() || {};
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

            if (!condition || !answers) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Condition and answers are required'
                    }
                };
            }

            const promptData = generateRiskAssessmentPrompt(condition, answers);

            // Create risk prediction entry
            const result = await DiseaseRiskPredictionService.createPrediction({
                userId,
                condition,
                promptData
            });

            return {
                status: 201,
                jsonBody: {
                    success: true,
                    data: result
                }
            };

        } catch (error) {
            context.error('Error in createRiskPredictions:', error);
            const err = logError('createRiskPredictions', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error creating risk prediction'
                }
            };
        }
    }

    /**
     * GET /api/disease-risk-predictions/summary
     * Retrieves a summary of unique disease risk predictions.
     * Returns diseaseId, diseaseName, and a representative riskScore.
     */
    getUniqueDiseaseRiskSummary = async (request, context) => {
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

            const risks = await DiseaseRiskPredictionService.getUniqueDiseaseRiskSummary(userId);
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    risks
                }
            };
        } catch (error) {
            context.error('Error in getUniqueDiseaseRiskSummary:', error);
            const err = logError('getUniqueDiseaseRiskSummary', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error fetching disease risk summary'
                }
            };
        }
    }

    getDiseaseRiskSummary = async (request, context) => {
        try {
            const { id } = request.params || {};

            if (!id) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Risk prediction ID is required'
                    }
                };
            }

            const risksummary = await DiseaseRiskPredictionService.getDiseaseRiskSummary(id);
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: risksummary
                }
            };
        } catch (error) {
            context.error('Error in getDiseaseRiskSummary:', error);
            const err = logError('getDiseaseRiskSummary', error, { 
                riskId: request.params?.id,
                userId: context.user?._id 
            });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error fetching disease risk summary'
                }
            };
        }
    }

    /**
     * PATCH /api/disease-risk-predictions/:id/symptom
     * Updates a single symptom's tracking value for a specific risk prediction.
     * Expects a request body with:
     * {
     *   "key": "Symptom Name",
     *   "value": true // or false
     * }
     */
    updateSymptomTracking = async (request, context) => {
        try {
            const { id } = request.params || {};
            const { key, value } = await request.json() || {};
            
            context.log(key, value);
            context.log(typeof key, typeof value);

            if (!id) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Risk prediction ID is required'
                    }
                };
            }

            if (typeof key !== 'string' || typeof value !== 'boolean') {
                return {
                    status: 400,
                    jsonBody: { 
                        success: false, 
                        message: 'Invalid request payload: key must be a string and value must be a boolean.' 
                    }
                };
            }

            const updatedPrediction = await DiseaseRiskPredictionService.updateSymptom(id, key, value);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: updatedPrediction
                }
            };
        } catch (error) {
            context.error('Error in updateSymptomTracking:', error);
            const err = logError('updateSymptomTracking', error, { 
                riskId: request.params?.id,
                userId: context.user?._id 
            });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error updating symptom tracking'
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new DiseasePredictionController();