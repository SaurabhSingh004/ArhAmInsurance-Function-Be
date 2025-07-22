const UserGoals = require('../models/userGoals');
const mongoose = require('mongoose');
const { logError } = require('../utils/logError');

class GoalsService {
    static async createGoals(userId, goalData) {
        try {
            // Validate userId
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID');
            }
    
            // Find existing goals or create new document
            let currentGoals = await UserGoals.findOne({ userId });
    
            if (currentGoals) {
                // If goals exist, update them
                const updateData = {};
    
                // Update goals if provided
                if (goalData.goals && Array.isArray(goalData.goals)) {
                    // Ensure each goal has required fields and proper structure
                    const formattedGoals = goalData.goals.map(goal => ({
                        title: goal.title,
                        description: goal.description || '',
                        current: goal.current,
                        target: goal.target,
                        status: goal.status || 'active',
                        startDate: goal.startDate || new Date(),
                        endDate: goal.endDate,
                        progress: goal.progress || []
                    }));
    
                    // Since we want only one active goal at a time
                    // Check if there's any active goal in the existing goals
                    const hasActiveGoal = currentGoals.goals.some(goal => goal.status === 'active');
                    
                    if (hasActiveGoal) {
                        throw new Error('An active goal already exists. Please complete or pause it before creating a new one.');
                    }
    
                    updateData.goals = formattedGoals;
                }
    
                // Update daily targets if provided
                if (goalData.dailyTargets) {
                    updateData.dailyTargets = {
                        ...currentGoals.dailyTargets, // Keep existing values
                        ...goalData.dailyTargets // Update with new values
                    };
                }
    
                const updatedGoals = await UserGoals.findOneAndUpdate(
                    { userId },
                    { $set: updateData },
                    { new: true }
                );
    
                return updatedGoals;
    
            } else {
                // Create new goals document
                let goalDocument = {
                    userId: userId,
                    goals: [],
                    dailyTargets: {
                        calories: goalData?.dailyTargets?.calories || 2000,
                        protein: goalData?.dailyTargets?.protein || 50,
                        carbohydrates: goalData?.dailyTargets?.carbohydrates || 275,
                        fat: goalData?.dailyTargets?.fat || 65,
                        water: goalData?.dailyTargets?.water || 2000,
                        steps: goalData?.dailyTargets?.steps || 6000,
                        sleep: goalData?.dailyTargets?.sleep || 8,
                        vitaminD: goalData?.dailyTargets?.vitaminD || 600,
                        iron: goalData?.dailyTargets?.iron || 18,
                        calcium: goalData?.dailyTargets?.calcium || 1000,
                        vitaminA: goalData?.dailyTargets?.vitaminA || 900,
                        vitaminC: goalData?.dailyTargets?.vitaminC || 90
                    }
                };
    
                // Add goals if provided
                if (goalData && goalData.goals && Array.isArray(goalData.goals)) {
                    // Only allow one active goal
                    const activeGoals = goalData.goals.filter(goal => goal.status === 'active');
                    if (activeGoals.length > 1) {
                        throw new Error('Only one active goal can be created at a time');
                    }
    
                    goalDocument.goals = goalData.goals.map(goal => ({
                        title: goal.title,
                        description: goal.description || '',
                        current: goal.current,
                        target: goal.target,
                        status: goal.status || 'active',
                        startDate: goal.startDate || new Date(),
                        endDate: goal.endDate,
                        progress: goal.progress || []
                    }));
                }
    
                const goals = await UserGoals.create(goalDocument);
                return goals;
            }
        } catch (error) {
            throw logError('createGoals', error, { userId, goalData });
        }
    }
    static async getGoals(userId) {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID');
            }

            const goals = await UserGoals.findOne({ userId });
            return goals;
        } catch (error) {
            throw logError('getGoals', error, { userId });
        }
    }

    static async getCurrentGoal(userId) {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID');
            }
    
            const userGoals = await UserGoals.findOne({ 
                userId,
                'goals.status': 'active'  // Look for active goals
            });
    
            if (!userGoals || !userGoals.goals.length) {
                return null;
            }
    
            // Find the active goal from the goals array
            const activeGoal = userGoals.goals.find(goal => goal.status === 'active');
            return activeGoal || null;
    
        } catch (error) {
            throw logError('getCurrentGoal', error, { userId });
        }
    }

    static async getDailyTargets(userId) {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID');
            }

            const goals = await UserGoals.findOne({ userId }).select('dailyTargets');
            if (!goals) {
                return null;
            }
            return goals.dailyTargets;
        } catch (error) {
            throw logError('getDailyTargets', error, { userId });
        }
    }

    static async updateGoals(userId, goalData) {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID');
            }

            const updateData = {};

            if (goalData.primaryGoal) {
                updateData.primaryGoal = goalData.primaryGoal;
            }

            if (goalData.secondaryGoals) {
                updateData.secondaryGoals = goalData.secondaryGoals;
            }

            if (goalData.dailyTargets) {
                updateData.dailyTargets = goalData.dailyTargets;
            }

            const updatedGoals = await UserGoals.findOneAndUpdate(
                { userId },
                { $set: updateData },
                { new: true }
            );

            if (!updatedGoals) {
                throw new Error('User goals not found');
            }

            return updatedGoals;
        } catch (error) {
            throw logError('updateGoals', error, { userId, goalData });
        }
    }

    static async updateWeightGoal(userId, weightData) {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID');
            }

            // Validate required weight data
            if (!weightData.target || !weightData.endDate || !weightData.weight) {
                throw new Error('Target weight, current weight, and end date are required');
            }

            const currentGoals = await UserGoals.findOne({ userId });
            let updateOperation;

            if (!currentGoals) {
                // Create new goals document with weight goal
                const newGoals = await UserGoals.create({
                    userId,
                    weightGoal: {
                        target: weightData.target,
                        endDate: weightData.endDate,
                        startDate: new Date(),
                        status: 'active',
                        points: weightData.points || 25,
                        progress: [{
                            date: new Date(),
                            weight: weightData.weight,
                            target: weightData.target,
                            notes: weightData.notes || 'Initial weight goal set'
                        }]
                    }
                });
                return newGoals.weightGoal;
            }

            // If goals exist, update weight goal
            if (currentGoals.weightGoal && currentGoals.weightGoal.target) {
                // Create progress entry with current goal state
                const progressEntry = {
                    date: new Date(),
                    weight: weightData.weight,
                    target: currentGoals.weightGoal.target,
                    notes: currentGoals.weightGoal.status || 'Weight goal updated'
                };

                updateOperation = {
                    $set: {
                        'weightGoal.target': weightData.target,
                        'weightGoal.endDate': weightData.endDate,
                        'weightGoal.status': weightData.status || 'active',
                        'weightGoal.points': weightData.points || currentGoals.weightGoal.points || 25
                    },
                    $push: {
                        'weightGoal.progress': progressEntry
                    }
                };
            } else {
                // Add new weight goal to existing goals document
                updateOperation = {
                    $set: {
                        weightGoal: {
                            target: weightData.target,
                            endDate: weightData.endDate,
                            startDate: new Date(),
                            status: 'active',
                            points: weightData.points || 25,
                            progress: [{
                                date: new Date(),
                                weight: weightData.weight,
                                target: weightData.target,
                                notes: weightData.notes || 'Initial weight goal set'
                            }]
                        }
                    }
                };
            }

            const updatedGoals = await UserGoals.findOneAndUpdate(
                { userId },
                updateOperation,
                { new: true }
            ).select('weightGoal');

            if (!updatedGoals) {
                throw new Error('Failed to update weight goal');
            }

            return updatedGoals.weightGoal;

        } catch (error) {
            throw logError('updateWeightGoal', error, {
                userId,
                weightData: {
                    ...weightData,
                    // Exclude sensitive fields if any
                }
            });
        }
    }

    static async updateWeightGoalStatus(userId, statusData) {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID');
            }

            // Validate status
            if (!statusData.status || !['active', 'completed', 'paused', 'abandoned'].includes(statusData.status)) {
                throw new Error('Invalid status value. Must be one of: active, completed, paused, abandoned');
            }

            const currentGoals = await UserGoals.findOne({ userId });
            if (!currentGoals || !currentGoals.weightGoal) {
                throw new Error('Weight goal not found');
            }

            const updateOperation = {
                $set: {
                    'weightGoal.status': statusData.status
                }
            };

            // Add notes to progress if provided
            if (statusData.notes) {
                const progressEntry = {
                    date: new Date(),
                    weight: currentGoals.weightGoal.progress[currentGoals.weightGoal.progress.length - 1]?.weight || 0,
                    target: currentGoals.weightGoal.target,
                    notes: `Status changed to ${statusData.status}: ${statusData.notes}`
                };
                updateOperation.$push = {
                    'weightGoal.progress': progressEntry
                };
            }

            const updatedGoals = await UserGoals.findOneAndUpdate(
                { userId },
                updateOperation,
                { new: true }
            ).select('weightGoal');

            if (!updatedGoals) {
                throw new Error('Failed to update weight goal status');
            }

            return updatedGoals.weightGoal;

        } catch (error) {
            throw logError('updateWeightGoalStatus', error, {
                userId,
                statusData
            });
        }
    }

    static async updateSecondaryGoal(userId, goalId, goalData) {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID');
            }

            const currentGoals = await UserGoals.findOne({ userId });
            if (!currentGoals) {
                throw new Error('User goals not found');
            }

            const goalIndex = currentGoals.secondaryGoals.findIndex(
                goal => goal._id.toString() === goalId
            );

            let updateOperation;
            if (goalIndex === -1) {
                // Add new secondary goal
                updateOperation = {
                    $push: {
                        secondaryGoals: {
                            title: goalData.title,
                            description: goalData.description,
                            target: goalData.target,
                            endDate: goalData.endDate,
                            startDate: new Date(),
                            status: 'active',
                            progress: []
                        }
                    }
                };
            } else {
                // Update existing goal and add progress
                const progressEntry = {
                    date: new Date(),
                    value: goalData.value,
                    notes: goalData.notes || 'Goal updated'
                };

                updateOperation = {
                    $set: {
                        [`secondaryGoals.${goalIndex}.target`]: goalData.target,
                        [`secondaryGoals.${goalIndex}.endDate`]: goalData.endDate,
                        [`secondaryGoals.${goalIndex}.status`]: goalData.status || 'active'
                    },
                    $push: {
                        [`secondaryGoals.${goalIndex}.progress`]: progressEntry
                    }
                };
            }

            const updatedGoals = await UserGoals.findOneAndUpdate(
                { userId },
                updateOperation,
                { new: true }
            ).select('secondaryGoals');

            if (!updatedGoals) {
                throw new Error('Failed to update secondary goal');
            }

            return updatedGoals.secondaryGoals;

        } catch (error) {
            throw logError('updateSecondaryGoal', error, {
                userId,
                goalId,
                goalData: {
                    ...goalData,
                    // Exclude sensitive fields if any
                }
            });
        }
    }

    static async deleteGoals(userId) {
        try {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID');
            }

            const result = await UserGoals.findOneAndDelete({ userId });
            if (!result) {
                throw new Error('User goals not found');
            }

            return result;
        } catch (error) {
            throw logError('deleteGoals', error, { userId });
        }
    }
}

module.exports = GoalsService;