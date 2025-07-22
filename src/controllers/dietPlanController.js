const DietPlanService = require('../services/DietPlanService');
const { ObjectId } = require('mongodb');
const { validateDate, formatDayMeals } = require('../utils/dietHelpers');
const { sendError, sendSuccess } = require('../utils/responseHelper');
const { logError } = require('../utils/logError');

class DietPlanController {

    generateTravelPersonalizedDietPlan = async (request, context) => {
        try {
            const { prompt, token, userId = "670291a485a1a72c804d91a4" } = await request.json() || {};

            // Validate required fields
            if (!userId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Missing required fields: userId, startDate, and endDate'
                    }
                };
            }

            if (!prompt) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        code: 0,
                        message: 'ENTER PROMPT'
                    }
                };
            }

            const start = new Date();
            const end = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));

            const maxTokens = token || 4090;

            const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            const totalWeeks = Math.ceil(totalDays / 7);

            const validatePlan = await DietPlanService.validateNewDietPlan(userId, start, end);
            if (validatePlan) {
                return {
                    status: 409,
                    jsonBody: {
                        success: false,
                        message: `Cannot create new diet plan. Active plan exists for ${validatePlan.startDate.toLocaleDateString()} to ${validatePlan.endDate.toLocaleDateString()}`
                    }
                };
            }

            const dietPlanId = new ObjectId();
            await DietPlanService.startPlanGeneration(
                userId,
                start,
                end,
                totalWeeks,
                prompt,
                maxTokens,
                totalDays,
                dietPlanId
            );

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    code: 1,
                    data: {
                        planId: dietPlanId,
                        message: "Your request for diet plan generation has been recorded successfully.",
                        status: 'processing'
                    }
                }
            };

        } catch (error) {
            const err = logError('generateTravelPersonalizedDietPlan', error, { userId: context.user?._id });
            return {
                status: 503,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    // Plan Generation and Management
    generatePersonalizedDietPlan = async (request, context) => {
        try {
            let userId = context.user?._id;

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const { prompt, token, startDate, endDate } = await request.json() || {};

            context.log("generatePersonalizedDietPlan", userId, startDate, endDate);

            // Validate required fields
            if (!userId || !startDate || !endDate) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Missing required fields: userId, startDate, and endDate'
                    }
                };
            }

            if (!prompt) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        code: 0,
                        message: 'ENTER PROMPT'
                    }
                };
            }

            const start = new Date(startDate);
            const end = new Date(endDate);
            const maxTokens = token || 4090;

            const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            const totalWeeks = Math.ceil(totalDays / 7);

            const validatePlan = await DietPlanService.validateNewDietPlan(userId, start, end);
            if (validatePlan) {
                return {
                    status: 409,
                    jsonBody: {
                        success: false,
                        message: `Cannot create new diet plan. Active plan exists for ${validatePlan.startDate.toLocaleDateString()} to ${validatePlan.endDate.toLocaleDateString()}`
                    }
                };
            }

            const dietPlanId = new ObjectId();
            await DietPlanService.startPlanGeneration(
                userId,
                start,
                end,
                totalWeeks,
                prompt,
                maxTokens,
                totalDays,
                dietPlanId
            );

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    code: 1,
                    data: {
                        planId: dietPlanId,
                        message: "Your request for diet plan generation has been recorded successfully.",
                        status: 'processing'
                    }
                }
            };

        } catch (error) {
            const err = logError('generatePersonalizedDietPlan', error, { userId: context.user?._id });
            return {
                status: 503,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    // Plan Retrieval Methods
    getDietPlanById = async (request, context) => {
        try {
            const { dietPlanId } = request.params || {};

            if (!dietPlanId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Missing required field: dietPlanId'
                    }
                };
            }

            const result = await DietPlanService.getDietPlanById(dietPlanId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: {
                        _id: result._id,
                        title: result.title,
                        startDate: result.weeklyDietPlans[0].startDate,
                        endDate: result.weeklyDietPlans[0].endDate,
                        daysDietPlanData: result.weeklyDietPlans[0].daysDietPlanData,
                        status: result.status
                    }
                }
            };
        } catch (error) {
            context.error('Error fetching diet plan:', error);
            const err = logError('getDietPlanById', error, {
                dietPlanId: request.params?.dietPlanId,
                userId: context.user?._id
            });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch diet plan',
                    error: err.message
                }
            };
        }
    }

    deleteDietPlan = async (request, context) => {
        try {
            const { dietPlanId } = request.params || {};

            if (!dietPlanId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Missing required field: dietPlanId'
                    }
                };
            }

            const result = await DietPlanService.deleteDietPlan(dietPlanId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: {
                        result,
                        message: 'Diet plan deleted successfully'
                    }
                }
            };
        } catch (error) {
            const err = logError('deleteDietPlan', error, {
                dietPlanId: request.params?.dietPlanId,
                userId: context.user?._id
            });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to delete diet plan',
                    error: err.message
                }
            };
        }
    }

    getDietPlansByUser = async (request, context) => {
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

            const result = await DietPlanService.getDietPlansByUser(userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result
                }
            };
        } catch (error) {
            const err = logError('getDietPlansByUser', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch diet plans',
                    error: err.message
                }
            };
        }
    }

    getDietForDate = async (request, context) => {
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

            const { date } = request.query || {};
            context.log(userId, date);

            if (!userId || !date) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Missing required fields: userId and date (YYYY-MM-DD format)'
                    }
                };
            }

            if (!validateDate(date)) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Invalid date format. Please use YYYY-MM-DD format'
                    }
                };
            }

            const dietPlan = await DietPlanService.getDietForDate(userId, date);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: {
                        dietPlanId: dietPlan?.dietPlanId,
                        isdietPlanFound: Boolean(dietPlan),
                        message: dietPlan ? "" : "Diet plan data not found for the specified date",
                        date: dietPlan?.date,
                        weekNumber: dietPlan?.weekNumber,
                        dayNumber: dietPlan?.dayNumber,
                        totalDays: dietPlan?.totalDays,
                        dayMeals: formatDayMeals(dietPlan?.dayMeals),
                        plannedWaterIntake: dietPlan?.plannedWaterIntake,
                        note: dietPlan?.note,
                        planInfo: dietPlan?.dietPlanInfo
                    }
                }
            };
        } catch (error) {
            const err = logError('getDietForDate', error, {
                userId: context.user?._id,
                date: request.query?.date
            });

            if (err.message.includes('No diet plan found')) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'No diet plan found for the specified date'
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch diet plan',
                    error: err.message
                }
            };
        }
    }

    // Meal Management Methods
    handleMealCompletion = async (request, context) => {
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

            const { dietPlanId, weekNumber, dayIndex, mealType, mealIndex, quantity = 1 } = await request.json() || {};

            const updatedPlan = await DietPlanService.updateMealCompletion(
                dietPlanId,
                weekNumber,
                dayIndex,
                mealType,
                mealIndex,
                userId,
                quantity
            );

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: updatedPlan
                }
            };
        } catch (error) {
            const err = logError('handleMealCompletion', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    addMeal = async (request, context) => {
        try {
            const { dietPlanId, dayIndex, mealType, weekIndex, mealData } = await request.json() || {};

            if (!dietPlanId || dayIndex === undefined || !mealType || !mealData) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Missing required fields: dietPlanId, dayIndex, mealType, and mealData'
                    }
                };
            }

            const result = await DietPlanService.addMeal(dietPlanId, weekIndex, dayIndex, mealType, mealData);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Meal added successfully'
                }
            };
        } catch (error) {
            const err = logError('addMeal', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to add meal',
                    error: err.message
                }
            };
        }
    }

    removeMeal = async (request, context) => {
        try {
            const { dietPlanId, dayIndex, mealType, mealId } = await request.json() || {};

            if (!dietPlanId || dayIndex === undefined || !mealType || !mealId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Missing required fields: dietPlanId, dayIndex, mealType, and mealId'
                    }
                };
            }

            const result = await DietPlanService.removeMeal(dietPlanId, dayIndex, mealType, mealId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Meal removed successfully'
                }
            };
        } catch (error) {
            const err = logError('removeMeal', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to remove meal',
                    error: err.message
                }
            };
        }
    }

    // Daily Log and Reports
    getDailyDietLog = async (request, context) => {
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

            const { date } = request.query || {};

            if (!date) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Missing required field: date'
                    }
                };
            }

            const result = await DietPlanService.getDailyDietLog(userId, date);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: {
                        result
                    }
                }
            };
        } catch (error) {
            const err = logError('getDailyDietLog', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch daily diet log',
                    error: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new DietPlanController();
