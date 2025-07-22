const UserGoals = require('../models/userGoals');
const goalsService = require('../services/GoalsService');

class GoalsController {

    createGoals = async (request, context) => {
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

            const goalData = await request.json() || {};

            const createdGoals = await goalsService.createGoals(userId, goalData);

            return {
                status: 201,
                jsonBody: {
                    success: true,
                    message: 'Goals created/updated successfully',
                    data: createdGoals
                }
            };
        } catch (error) {
            context.error('Error in createGoals:', error);
            const err = logError('createGoals', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error creating/updating goals'
                }
            };
        }
    }

    getGoals = async (request, context) => {
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

            const goals = await goalsService.getGoals(userId);
            
            if (!goals) {
                return {
                    status: 200,
                    jsonBody: {
                        success: false,
                        message: 'No goals found for this user',
                        data: {}
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Goals fetched successfully',
                    data: goals
                }
            };
        } catch (error) {
            context.error('Error in getGoals:', error);
            const err = logError('getGoals', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error fetching goals'
                }
            };
        }
    }

    getCurrentGoal = async (request, context) => {
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

            const weightGoal = await goalsService.getCurrentGoal(userId);
            
            if (!weightGoal) {
                return {
                    status: 200,
                    jsonBody: {
                        success: false,
                        message: 'No weight goal found for this user',
                        data: {}
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Weight goal fetched successfully',
                    data: weightGoal
                }
            };
        } catch (error) {
            context.error('Error in getCurrentGoal:', error);
            const err = logError('getCurrentGoal', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error fetching weight goal'
                }
            };
        }
    }

    getDailyTargets = async (request, context) => {
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

            const dailyTargets = await goalsService.getDailyTargets(userId);
            
            if (!dailyTargets) {
                return {
                    status: 200,
                    jsonBody: {
                        success: false,
                        message: 'No daily targets found for this user',
                        data: {}
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Daily targets fetched successfully',
                    data: dailyTargets
                }
            };
        } catch (error) {
            context.error('Error in getDailyTargets:', error);
            const err = logError('getDailyTargets', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error fetching daily targets'
                }
            };
        }
    }

    updateGoals = async (request, context) => {
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

            const goalData = await request.json() || {};

            const updatedGoals = await goalsService.updateGoals(userId, goalData);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Goals updated successfully',
                    data: updatedGoals
                }
            };
        } catch (error) {
            context.error('Error in updateGoals:', error);
            const err = logError('updateGoals', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error updating goals'
                }
            };
        }
    }

    updateWeightGoal = async (request, context) => {
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

            const weightData = await request.json() || {};

            const updatedWeightGoal = await goalsService.updateWeightGoal(userId, weightData);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Weight goal updated successfully',
                    data: updatedWeightGoal
                }
            };
        } catch (error) {
            context.error('Error in updateWeightGoal:', error);
            const err = logError('updateWeightGoal', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error updating weight goal'
                }
            };
        }
    }

    updateSecondaryGoal = async (request, context) => {
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

            const { goalId } = request.params || {};
            const goalData = await request.json() || {};

            if (!goalId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Goal ID is required'
                    }
                };
            }

            const updatedSecondaryGoal = await goalsService.updateSecondaryGoal(userId, goalId, goalData);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Secondary goal updated successfully',
                    data: updatedSecondaryGoal
                }
            };
        } catch (error) {
            context.error('Error in updateSecondaryGoal:', error);
            const err = logError('updateSecondaryGoal', error, { 
                userId: context.user?._id,
                goalId: request.params?.goalId 
            });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error updating secondary goal'
                }
            };
        }
    }

    updateWeightGoalStatus = async (request, context) => {
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

            const statusData = await request.json() || {};

            const updatedWeightGoal = await goalsService.updateWeightGoalStatus(userId, statusData);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Weight goal status updated successfully',
                    data: updatedWeightGoal
                }
            };
        } catch (error) {
            context.error('Error in updateWeightGoalStatus:', error);
            const err = logError('updateWeightGoalStatus', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error updating weight goal status'
                }
            };
        }
    }

    deleteGoals = async (request, context) => {
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

            const deletedGoals = await goalsService.deleteGoals(userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Goals deleted successfully',
                    data: deletedGoals
                }
            };
        } catch (error) {
            context.error('Error in deleteGoals:', error);
            const err = logError('deleteGoals', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error deleting goals'
                }
            };
        }
    }

    getAllUserGoals = async (request, context) => {
        try {
            const goals = await UserGoals.find()
                .select('-__v')
                .populate('userId', 'email profile');

            if (goals.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'No goals found'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'All user goals retrieved successfully',
                    data: goals
                }
            };
        } catch (error) {
            const err = logError('getAllUserGoals', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error fetching user goals',
                    error: err.message
                }
            };
        }
    }
}
module.exports = new GoalsController();
