const DietPlanModel = require('../models/dietPlans');
const generateDietPlanData = require('../utils/prompts/gptPrompt-40');
const axios = require('axios');
const UserRewardService = require('../services/UseRewardsService');
const TaskService = require('./TaskService');
const MealService = require('../services/FoodService/MealService');
class DietPlanService {
    // Constants
    static API_CONFIG = {
        endpoint: process.env.AZURE_ENDPOINT,
        apiKey: process.env.AZURE_API_KEY,
        deploymentName: process.env.AZURE_DEPLOYMENT_NAME,
        apiVersion: process.env.AZURE_API_VERSION,
        timeout: 180000, // 3 minutes
        maxRetries: 3,
        baseDelay: 3000
    };

    static async getDietPlanById(dietPlanId) {
        try {
            return await DietPlanModel.findById(dietPlanId)
                .populate({
                    path: 'weeklyDietPlans.daysDietPlanData',
                    populate: [
                        {
                            path: 'breakfast_meal.meals',
                            select: '-createdAt -updatedAt -__v'
                        },
                        {
                            path: 'lunch_meal.meals',
                            select: '-createdAt -updatedAt -__v'
                        },
                        {
                            path: 'evening_snack.meals',
                            select: '-createdAt -updatedAt -__v'
                        },
                        {
                            path: 'dinner_meal.meals',
                            select: '-createdAt -updatedAt -__v'
                        }
                    ]
                })
                .exec();
        } catch (error) {
            throw new Error(`Error fetching diet plan: ${error.message}`);
        }
    }

    static async getDietPlansByUser(userId) {
        try {
            return await DietPlanModel.find({ userId })
                .populate({
                    path: 'weeklyDietPlans.daysDietPlanData',
                    populate: [
                        { path: 'breakfast_meal.meals', select: '-createdAt -updatedAt -__v' },
                        { path: 'lunch_meal.meals', select: '-createdAt -updatedAt -__v' },
                        { path: 'evening_snack.meals', select: '-createdAt -updatedAt -__v' },
                        { path: 'dinner_meal.meals', select: '-createdAt -updatedAt -__v' }
                    ]
                })
                .exec();
        } catch (error) {
            throw new Error(`Error fetching diet plans: ${error.message}`);
        }
    }

    // Validation Methods
    static async validateNewDietPlan(userId, startDate, endDate) {
        try {
            const newStartDate = new Date(startDate).setHours(0, 0, 0, 0);
            const newEndDate = new Date(endDate).setHours(23, 59, 59, 999);

            const existingPlan = await DietPlanModel.findOne({
                userId,
                $or: [
                    { startDate: { $lte: newStartDate }, endDate: { $gte: newStartDate } },
                    { startDate: { $lte: newEndDate }, endDate: { $gte: newEndDate } },
                    { startDate: { $gte: newStartDate }, endDate: { $lte: newEndDate } }
                ]
            });

            if (existingPlan) {
                return existingPlan;
            }
            return null;
        } catch (error) {
            throw error;
        }
    }

    // Plan Generation Methods
    static async startPlanGeneration(userId, start, end, totalWeeks, prompt, maxTokens, totalDays, dietPlanId) {
        try {
            console.log("start", start);
            // Generate first day
            const firstDayPlan = await this.generateFirstDay(prompt, maxTokens, start);

            // Create initial plan
            await this.createInitialPlan(userId, start, end, totalWeeks, firstDayPlan, dietPlanId);

            // Start background generation for remaining days
            this.startBackgroundGeneration(userId, dietPlanId, prompt, maxTokens, start, totalDays);

            return firstDayPlan;
        } catch (error) {
            throw new Error(`Failed to start plan generation: ${error.message}`);
        }
    }

    // Private Methods
    static async generateFirstDay(prompt, maxTokens, startDate) {
        const response = await this.makeAPICall(prompt, maxTokens, startDate);
        const parsedPlan = await this.parseAndFixJson(response.data.choices[0].message.content);
        const startDayDate = startDate;
        parsedPlan.daysDietPlanData[0].date = startDayDate;
        return parsedPlan;
    }

    static async createInitialPlan(userId, start, end, totalWeeks, firstDayPlan, dietPlanId) {
        const firstWeekEnd = this.calculateWeekEndDate(start, end);
        return await DietPlanModel.create({
            _id: dietPlanId,
            userId,
            title: firstDayPlan.title,
            startDate: start,
            endDate: end,
            totalWeeks,
            status: 'PROCESSING',
            generationProgress: {
                currentWeek: 1,
                currentDay: 1,
                totalDaysGenerated: 1,
                lastError: null
            },
            weeklyDietPlans: [{
                weekNumber: 1,
                startDate: start,
                endDate: firstWeekEnd,
                title: 'Week 1 Diet Plan',
                daysDietPlanData: [firstDayPlan?.daysDietPlanData[0]]
            }]
        });
    }

    static startBackgroundGeneration(userId, planId, prompt, maxTokens, startDate, totalDays) {
        process.nextTick(async () => {
            try {
                await this.generateRemainingDays(userId, planId, prompt, maxTokens, startDate, totalDays);
                await this.finalizePlan(userId, planId);
            } catch (error) {
                await this.handleGenerationError(planId, error);
            }
        });
    }

    static async generateRemainingDays(userId, planId, prompt, maxTokens, startDate, totalDays) {
        const batchSize = 3;
        const delay = 200;

        // Parse startDate if it's a string
        const planStartDate = startDate instanceof Date ? startDate : new Date(startDate);

        for (let day = 2; day <= totalDays; day += batchSize) {
            const batch = [];

            for (let i = 0; i < batchSize && (day + i) <= totalDays; i++) {
                batch.push(this.generateAndSaveDay(
                    planId,
                    prompt,
                    maxTokens,
                    planStartDate,
                    day + i
                ));
            }

            const results = await Promise.allSettled(batch);
            await this.updateProgress(planId, day + results.filter(r => r.status === 'fulfilled').length - 1, totalDays);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    static async generateAndSaveDay(planId, basePrompt, maxTokens, startDate, day) {
        try {
            // Create a new Date object to avoid modifying the original startDate
            const currentDate = new Date(startDate.getTime());
            // Calculate the correct date by adding days
            currentDate.setDate(startDate.getDate() + (day - 1));

            console.log("Generating for day", day, "date:", currentDate.toISOString().split('T')[0]);

            // Generate the prompt for this day
            const dayPrompt = `${basePrompt} for day ${day} on ${currentDate.toISOString().split('T')[0]}`;
            console.log(`Generating diet plan for day ${day}, planId: ${planId}`);

            // Make API call
            const response = await this.makeAPICall(dayPrompt, maxTokens, currentDate);

            // Parse and validate response
            const parsedPlan = await this.parseAndFixJson(response.data.choices[0].message.content);
            if (!parsedPlan?.daysDietPlanData?.[0]) {
                throw new Error('Invalid diet plan data structure');
            }

            // Calculate week number
            const weekNumber = Math.ceil(day / 7);
            await this.saveDayToWeek(planId, day, currentDate, parsedPlan, weekNumber);

            console.log(`Successfully generated and saved diet plan for day ${day}, planId: ${planId}`);
            return true;
        } catch (error) {
            console.error(`Error generating day ${day} plan:`, error);
            await DietPlanModel.updateOne(
                { _id: planId },
                {
                    $push: {
                        'generationProgress.errors': {
                            day,
                            error: error.message,
                            timestamp: new Date()
                        }
                    }
                }
            );
            throw error;
        }
    }

    static async saveDayToWeek(planId, day, currentDate, plan, weekNumber) {
        try {
            // First, ensure the week exists
            const dietPlan = await DietPlanModel.findById(planId);
            const weekExists = dietPlan.weeklyDietPlans.some(w => w.weekNumber === weekNumber);

            if (!weekExists) {
                // Calculate week start and end dates properly
                const weekStartDayNumber = (weekNumber - 1) * 7 + 1;

                // Create a new Date object based on the plan's start date
                const weekStart = new Date(dietPlan.startDate);
                weekStart.setDate(weekStart.getDate() + (weekStartDayNumber - 1));

                let weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                // Ensure week end doesn't exceed plan end date
                if (weekEnd > dietPlan.endDate) {
                    weekEnd = new Date(dietPlan.endDate);
                }

                await DietPlanModel.updateOne(
                    { _id: planId },
                    {
                        $push: {
                            weeklyDietPlans: {
                                weekNumber,
                                startDate: weekStart,
                                endDate: weekEnd,
                                title: `Week ${weekNumber} Diet Plan`,
                                daysDietPlanData: []
                            }
                        }
                    }
                );
            }

            // Add the day's plan to the correct week with the correct date
            await DietPlanModel.updateOne(
                {
                    _id: planId,
                    'weeklyDietPlans.weekNumber': weekNumber
                },
                {
                    $push: {
                        'weeklyDietPlans.$.daysDietPlanData': {
                            ...plan.daysDietPlanData[0],
                            date: currentDate
                        }
                    },
                    $set: {
                        'generationProgress.currentDay': day,
                        'generationProgress.totalDaysGenerated': day,
                        'generationProgress.currentWeek': weekNumber,
                        updatedAt: new Date()
                    }
                }
            );
        } catch (error) {
            console.error(`Error saving day ${day} plan:`, error);
            throw error;
        }
    }

    static async makeAPICall(prompt, maxTokens, currentDate, retryCount = 0) {
        try {
            return await axios.post(
                `${this.API_CONFIG.endpoint}/openai/deployments/${this.API_CONFIG.deploymentName}/chat/completions?api-version=${this.API_CONFIG.apiVersion}`,
                generateDietPlanData(prompt, maxTokens, currentDate),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': this.API_CONFIG.apiKey
                    },
                    timeout: this.API_CONFIG.timeout
                }
            );
        } catch (error) {
            if (retryCount < this.API_CONFIG.maxRetries) {
                const delay = this.API_CONFIG.baseDelay * Math.pow(2, retryCount);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.makeAPICall(prompt, maxTokens, currentDate, retryCount + 1);
            }
            throw error;
        }
    }

    // Utility Methods
    static calculateWeekEndDate(startDate, endDate) {
        const weekEnd = new Date(startDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return weekEnd > endDate ? endDate : weekEnd;
    }

    static async parseAndFixJson(jsonString) {
        const cleanedString = jsonString.replace(/```json|```/g, '').trim();
        try {
            return JSON.parse(cleanedString);
        } catch (error) {
            // Add JSON repair logic if needed
            throw new Error(`Failed to parse JSON: ${error.message}`);
        }
    }

    static async updateProgress(planId, completedDays, totalDays) {
        const progress = (completedDays / totalDays) * 100;
        await DietPlanModel.updateOne(
            { _id: planId },
            {
                $set: {
                    'generationProgress.totalDaysGenerated': completedDays,
                    'generationProgress.progress': progress.toFixed(2),
                    'generationProgress.lastUpdated': new Date()
                }
            }
        );
    }

    static async finalizePlan(userId, planId) {

        const dietReward = await TaskService.getTaskByFeatureType("Diet Planning");
        console.log("dietReward", dietReward, userId);
        await UserRewardService.updateDailyTaskCompletion(userId, dietReward._id, dietReward.points);

        await DietPlanModel.updateOne(
            { _id: planId },
            { $set: { status: 'COMPLETED', 'generationProgress.completedAt': new Date() } }
        );

        // await notificationService.createNotification(
        //     "Diet Plan Created",
        //     "Your diet plan has been generated successfully.",
        //     userId,
        //     "info"
        // );
    }

    static async handleGenerationError(planId, error) {
        await DietPlanModel.updateOne(
            { _id: planId },
            {
                $set: {
                    status: 'ERROR',
                    'generationProgress.lastError': error.message,
                    'generationProgress.completedAt': new Date()
                }
            }
        );
    }

    /**
 * Get diet plan for a specific date
 * @param {string} userId 
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise} Day's diet plan
 */
    static async getDietForDate(userId, date, isFromdailyPlan = true) {
        try {
            const queryDate = new Date(date);

            // Calculate start and end of that day
            const startOfDay = new Date(queryDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(queryDate);
            endOfDay.setHours(23, 59, 59, 999);
            // Now find a diet plan that overlaps with [startOfDay, endOfDay]
            const dietPlan = await DietPlanModel.findOne({
                userId,
                // The plan must start on or before the day ends
                startDate: { $lte: endOfDay },
                // and end on or after the day begins
                endDate: { $gte: startOfDay }
            });
            console.log("dietPlan", dietPlan);
            if (!dietPlan && isFromdailyPlan) {
                return null;
            }

            if (dietPlan) {
                // Find the specific weekly plan that contains the query date
                const weeklyPlan = dietPlan.weeklyDietPlans.find(week => {
                    const weekStart = new Date(week.startDate);
                    const weekEnd = new Date(week.endDate);
                    return queryDate >= weekStart && queryDate <= weekEnd;
                });
                console.log("weeklyPlan", weeklyPlan);
                // Find the specific day's diet plan within the weekly plan
                const dayPlan = weeklyPlan?.daysDietPlanData.find(day => {
                    const planDate = new Date(day.date);
                    console.log("planDate", planDate, queryDate);
                    return planDate.getTime() === queryDate.getTime();
                });
                console.log("dayPlan", dayPlan);
                if (!dayPlan) {
                    return null;
                }

                // Populate all meal references
                const populatedPlan = await DietPlanModel.findById(dietPlan._id)
                    .populate({
                        path: 'weeklyDietPlans.daysDietPlanData',
                        populate: [
                            {
                                path: 'breakfast_meal.meals',
                                select: '-createdAt -updatedAt -__v'
                            },
                            {
                                path: 'lunch_meal.meals',
                                select: '-createdAt -updatedAt -__v'
                            },
                            {
                                path: 'evening_snack.meals',
                                select: '-createdAt -updatedAt -__v'
                            },
                            {
                                path: 'dinner_meal.meals',
                                select: '-createdAt -updatedAt -__v'
                            }
                        ]
                    })
                    .exec();
                console.log("populatedPlan", populatedPlan);
                // Find the populated day plan
                const populatedWeeklyPlan = populatedPlan.weeklyDietPlans.find(week =>
                    week._id.toString() === weeklyPlan._id.toString()
                );
                console.log("populatedWeeklyPlan", populatedWeeklyPlan);
                const populatedDayPlan = populatedWeeklyPlan.daysDietPlanData.find(day =>
                    new Date(day.date).getTime() === queryDate.getTime()
                );
                console.log("populatedDayPlan", populatedDayPlan);
                const dayIndex = populatedWeeklyPlan.daysDietPlanData.findIndex(day =>
                    new Date(day.date).getTime() === queryDate.getTime()
                );
                console.log("dayIndex", dayIndex);

                // Calculate total days (sum of all weekly plans * 7)
                const totalDays = dietPlan.totalWeeks * 7;
                // Calculate day number (days since start of diet plan)
                const startDate = new Date(dietPlan.startDate);
                startDate.setHours(0, 0, 0, 0);
                const matches = populatedDayPlan?.total_water?.match(/(\d+)-(\d+)/);
                return {
                    dietPlanId: dietPlan._id,
                    date: queryDate,
                    dayNumber: dayIndex,
                    weekNumber: weeklyPlan.weekNumber,
                    totalDays: totalDays,
                    plannedWaterIntake: matches ? parseInt(matches[2], 10) * 240 : parseInt(populatedDayPlan.total_water) * 240, // 240 ml per glass
                    note: populatedDayPlan.note,
                    dayMeals: {
                        breakfast: populatedDayPlan.breakfast_meal,
                        morningSnack: populatedDayPlan.morning_snack,
                        lunch: populatedDayPlan.lunch_meal,
                        eveningSnack: populatedDayPlan.evening_snack,
                        dinner: populatedDayPlan.dinner_meal,
                        preWorkout: populatedDayPlan.pre_workout,
                        postWorkout: populatedDayPlan.post_workout
                    },
                    dietPlanInfo: {
                        title: dietPlan.title,
                        startDate: dietPlan.startDate,
                        endDate: dietPlan.endDate,
                        isComplete: dietPlan.status === 'COMPLETED'
                    }
                };
            } else {
                return null;
            }
        } catch (error) {
            console.log(error);
            throw new Error(`Error fetching diet plan: ${error.message}`);
        }
    }

    /**
   * Get diet plan by ID with populated meal references
   * @param {string} dietPlanId 
   */
    static async deleteDietPlan(dietPlanId) {
        try {
            const dietPlan = await DietPlanModel.findByIdAndDelete(dietPlanId);

            if (!dietPlan) {
                throw new Error('Diet plan not found');
            }

            return dietPlan;
        } catch (error) {
            throw new Error(`Error fetching diet plan: ${error.message}`);
        }
    }

    /**
     * Get meals for a specific date range with aggregated nutrition data
     * @param {string} userId - The user's ID
     * @param {Date} date - date for filtering
     * @returns {Promise<Object>} Meals and nutrition data
     */
    static async getDailyDietLog(userId, date) {
        try {
            const today = new Date(date);
            const startOfDay = new Date(today);
            startOfDay.setUTCHours(0, 0, 0, 0);

            const endOfDay = new Date(today);
            endOfDay.setUTCHours(23, 59, 59, 999);

            // Find meals created or updated today
            const meals = await mealModel.find({
                userId,
                $or: [
                    // Check both createdAt and updatedAt fields
                    { createdAt: { $gte: startOfDay, $lte: endOfDay } },
                    { updatedAt: { $gte: startOfDay, $lte: endOfDay } }
                ]
            }).populate({
                path: 'meal',
                model: 'foods',
                select: '-food_count -createdAt -updatedAt'
            }).sort({ createdAt: -1 });// Most recent first

            if (meals.length == 0) {
                return {
                    success: true,
                    date: date,
                    totalMeals: meals.length,
                    dailyTotals: {},
                    meals: []
                };
            }

            // Calculate nutrition totals
            const dailyTotals = meals.reduce((totals, meal) => {
                if (meal.meal) {
                    totals.carbohydrates += parseFloat(meal.meal.carbohydrates || 0);
                    totals.protein += parseFloat(meal.meal.protein || 0);
                    totals.fats += parseFloat(meal.meal.fats || 0) + parseFloat(meal.meal.monounsaturated_fats || 0) + parseFloat(meal.meal.polyunsaturated_fats || 0) + parseFloat(meal.meal.saturated_fats || 0) + parseFloat(meal.meal.trans_fats || 0);
                    totals.energy += parseFloat(meal.meal.energy || 0);
                    totals.fibre += parseFloat(meal.meal.fibre || 0);
                    totals.sugars += parseFloat(meal.meal.sugars || 0);
                    totals.calories += parseFloat(meal.meal.calories || 0);
                }
                return totals;
            }, {
                carbohydrates: 0,
                protein: 0,
                fats: 0,
                energy: 0,
                fibre: 0,
                sugars: 0,
                calories: 0
            });

            // Format meal data
            const formattedMeals = meals.map(meal => ({
                id: meal._id,
                timeConsumed: meal.createdAt,
                mealHits: meal.mealHits,
                foodDetails: {
                    name: meal.meal?.item_name,
                    servingSize: meal.meal?.serving_size,
                    servingSizeUom: meal.meal?.serving_size_uom,
                    nutrition: {
                        carbohydrates: meal.meal?.carbohydrates,
                        protein: meal.meal?.protein,
                        fats: parseFloat(meal.meal.fats || 0) + parseFloat(meal.meal.monounsaturated_fats || 0) + parseFloat(meal.meal.polyunsaturated_fats || 0) + parseFloat(meal.meal.saturated_fats || 0) + parseFloat(meal.meal.trans_fats || 0),
                        energy: meal.meal?.energy,
                        fibre: meal.meal?.fibre,
                        sugars: meal.meal?.sugars,
                        calories: meal.meal?.calories,
                    }
                }
            }));

            return {
                success: true,
                date: date,
                totalMeals: meals.length,
                dailyTotals,
                meals: formattedMeals,
            };

        } catch (error) {
            throw new Error(`Error in getDailyMeals: ${error.message}`);
        }
    }

    /**
     * Get meals for a specific date range with aggregated nutrition data
     * @param {string} userId - The user's ID
     * @param {Date} date - date for filtering
     * @returns {Promise<Object>} Meals and nutrition data
     */
    static async getDurationDietLog(userId, startDate, endDate) {
        try {
            const endDay = new Date(endDate);
            let currentDate = new Date(startDate);
            let durationTotalLogs = [];
            while (currentDate <= endDay) {
                console.log("currrdate", currentDate);
                const startOfDay = new Date(currentDate);
                startOfDay.setUTCHours(0, 0, 0, 0);

                const endOfDay = new Date(currentDate);
                endOfDay.setUTCHours(23, 59, 59, 999);

                // Find meals created or updated today
                const meals = await mealModel.find({
                    userId,
                    $or: [
                        // Check both createdAt and updatedAt fields
                        { createdAt: { $gte: startOfDay, $lte: endOfDay } },
                        { updatedAt: { $gte: startOfDay, $lte: endOfDay } }
                    ]
                }).populate({
                    path: 'meal',
                    model: 'foods',
                    select: '-food_count -createdAt -updatedAt'
                }).sort({ createdAt: -1 }); // Most recent first
                console.log(meals);
                // Calculate nutrition totals
                const dailyTotals = meals?.reduce((totals, meal) => {
                    if (meal.meal) {
                        totals.carbohydrates += parseFloat(meal.meal.carbohydrates || 0);
                        totals.protein += parseFloat(meal.meal.protein || 0);
                        totals.fats += parseFloat(meal.meal.fats || 0) + parseFloat(meal.meal.monounsaturated_fats || 0) + parseFloat(meal.meal.polyunsaturated_fats || 0) + parseFloat(meal.meal.saturated_fats || 0) + parseFloat(meal.meal.trans_fats || 0);
                        totals.energy += parseFloat(meal.meal.energy || 0);
                        totals.fibre += parseFloat(meal.meal.fibre || 0);
                        totals.sugars += parseFloat(meal.meal.sugars || 0);
                        totals.calories += parseFloat(meal.meal.calories || 0);
                        totals.date = meal.createdAt
                    }
                    return totals;
                }, {
                    carbohydrates: 0,
                    protein: 0,
                    fats: 0,
                    energy: 0,
                    fibre: 0,
                    sugars: 0,
                    calories: 0,
                    date: startOfDay
                });
                console.log("dailyMyTotals", dailyTotals);
                durationTotalLogs.push(dailyTotals);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            console.log("durationTotalLogs", durationTotalLogs);
            return {
                success: true,
                startDate: startDate,
                endDate: endDate,
                durationTotalLogs
            };

        } catch (error) {
            console.log(error);
            throw new Error(`Error in getDailyMeals: ${error.message}`);
        }
    }

    static async updateMealCompletion(dietPlanId, weekNumber, dayIndex, mealType, mealIndex, userId, quantity) {
        try {
            console.log("updatemealcompletion ", dietPlanId, weekNumber, dayIndex, mealType, mealIndex, userId, quantity);
            // Input validation
            if (dietPlanId == undefined || weekNumber == undefined || dayIndex == undefined || mealType == undefined || mealIndex == undefined || userId == undefined || quantity == undefined) {
                throw new Error('Missing required parameters');
            }

            // Validate meal type
            const validMealTypes = [
                'breakfast_meal',
                'lunch_meal',
                'evening_snack',
                'dinner_meal',
            ];

            if (!validMealTypes.includes(mealType)) {
                throw new Error('Invalid meal type');
            }

            // Fetch the diet plan document to get meal details
            const dietPlan = await DietPlanModel.findById(dietPlanId);
            if (!dietPlan) {
                throw new Error('Diet plan not found');
            }

            // Retrieve the meal data
            const meal = dietPlan.weeklyDietPlans[weekNumber - 1]
                .daysDietPlanData[dayIndex][mealType][0]
                .meals[mealIndex];
            console.log("dietPlan", meal);
            if (!meal) {
                throw new Error('Meal not found');
            }

            // Construct the update path for the specific meal
            const mealCompletionPath = `weeklyDietPlans.${weekNumber - 1}.daysDietPlanData.${dayIndex}.${mealType}.0.meals.${mealIndex}.isCompleted`;

            // Update the meal completion status
            await DietPlanModel.findByIdAndUpdate(
                dietPlanId,
                { $set: { [mealCompletionPath]: true } },
                { new: true }
            );

            // Call addAndUpdateMeal to log the meal in meal schema
            await MealService.addAndUpdateMeal(userId, meal, mealType, quantity);

            return {
                success: true,
                message: 'Meal completion status updated and meal added successfully'
            };

        } catch (error) {
            console.error('Error in updateMealCompletion:', error);
            throw error;
        }
    }

    static async addMeal(dietPlanId, weekIndex, dayIndex, mealType, mealData) {
        try {
            // Construct the update path for the specific meal type
            const updatePath = `weeklyDietPlans.${weekIndex}.daysDietPlanData.${dayIndex}.${mealType}`;

            // Create a new meals array object with the meal data
            const newMealArray = {
                meals: [{
                    item_name: mealData.item_name,
                    imageUrl: mealData.imageUrl,
                    carbohydrates: mealData.carbohydrates,
                    protein: mealData.protein,
                    fats: mealData.fats,
                    monounsaturated_fats: mealData.monounsaturated_fats,
                    polyunsaturated_fats: mealData.polyunsaturated_fats,
                    saturated_fats: mealData.saturated_fats,
                    trans_fats: mealData.trans_fats,
                    fibre: mealData.fibre,
                    sugars: mealData.sugars,
                    calcium: mealData.calcium,
                    calories: mealData.calories,
                    iron: mealData.iron,
                    energy: mealData.energy,
                    magnesium: mealData.magnesium,
                    phosphorus: mealData.phosphorus,
                    potassium: mealData.potassium,
                    sodium: mealData.sodium,
                    zinc: mealData.zinc,
                    copper: mealData.copper,
                    manganese: mealData.manganese,
                    iodine: mealData.iodine,
                    vitamin_a: mealData.vitamin_a,
                    vitamin_b6: mealData.vitamin_b6,
                    vitamin_b12: mealData.vitamin_b12,
                    vitamin_c: mealData.vitamin_c,
                    vitamin_d: mealData.vitamin_d,
                    vitamin_e: mealData.vitamin_e,
                    vitamin_k: mealData.vitamin_k,
                    caffeine: mealData.caffeine,
                    cholesterol: mealData.cholesterol,
                    serving_size: mealData.serving_size,
                    serving_size_uom: mealData.serving_size_uom,
                    household_serving_size: mealData.household_serving_size,
                    household_serving_size_uom: mealData.household_serving_size_uom,
                    isCompleted: mealData.isCompleted || false
                }]
            };

            // Update the diet plan by pushing the new meal array
            return await DietPlanModel.findByIdAndUpdate(
                dietPlanId,
                {
                    $push: {
                        [updatePath]: newMealArray
                    },
                    updatedAt: new Date()
                },
                { new: true }
            ).exec();
        } catch (error) {
            throw new Error(`Error adding meal: ${error.message}`);
        }
    }

    static async removeMeal(dietPlanId, weekIndex, dayIndex, mealType, mealArrayIndex, mealIndex) {
        try {
            // Construct the update path for the specific meal
            const updatePath = `weeklyDietPlans.${weekIndex}.daysDietPlanData.${dayIndex}.${mealType}.${mealArrayIndex}.meals.${mealIndex}`;

            // Create the pull operation using the $unset operator to remove the specific meal
            const updateOperation = {
                $unset: {
                    [updatePath]: 1
                },
                updatedAt: new Date()
            };

            // Remove the meal and then pull null values to clean up the array
            const result = await DietPlanModel.findByIdAndUpdate(
                dietPlanId,
                updateOperation,
                { new: true }
            );

            // Clean up the array by removing null values
            const cleanupPath = `weeklyDietPlans.${weekIndex}.daysDietPlanData.${dayIndex}.${mealType}.${mealArrayIndex}.meals`;
            await DietPlanModel.findByIdAndUpdate(
                dietPlanId,
                {
                    $pull: {
                        [cleanupPath]: null
                    }
                },
                { new: true }
            );

            return result;
        } catch (error) {
            throw new Error(`Error removing meal: ${error.message}`);
        }
    }
}

module.exports = DietPlanService;