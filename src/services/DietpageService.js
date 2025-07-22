const MealService = require('../services/FoodService/MealService');
const DietPlanService = require('../services/DietPlanService');
const { logError } = require('../utils/logError');
const GoalsService = require('../services/GoalsService');

class DietPageService {
    static async getTodaysDietPage(userId, date) {
        try {
            const queryDate = new Date(date);
            queryDate.setHours(0, 0, 0, 0);
            const dailyMeals = await MealService.getDailyMeals(userId, date);
            const goalData = await GoalsService.getDailyTargets(userId);
     
            return {
                calories: {
                    current: dailyMeals.dailyTotals.calories,
                    target: goalData.calories
                },
                macros: {
                    protein: { 
                        current: dailyMeals.dailyTotals.protein, 
                        target: goalData.protein, 
                        unit: 'g' 
                    },
                    fat: { 
                        current: dailyMeals.dailyTotals.fats, 
                        target: goalData.fat, 
                        unit: 'g' 
                    },
                    carbs: { 
                        current: dailyMeals.dailyTotals.carbohydrates, 
                        target: goalData.carbohydrates, 
                        unit: 'g' 
                    }
                },
                micronutrients: {
                    vitaminD: { 
                        current: dailyMeals.dailyTotals.vitamin_d, 
                        target: goalData.vitaminD, 
                        unit: 'IU' 
                    },
                    iron: { 
                        current: dailyMeals.dailyTotals.iron, 
                        target: goalData.iron, 
                        unit: 'mg' 
                    },
                    calcium: { 
                        current: dailyMeals.dailyTotals.calcium, 
                        target: goalData.calcium, 
                        unit: 'mg' 
                    },
                    vitaminC: {
                        current: dailyMeals.dailyTotals.vitamin_c,
                        target: goalData.vitaminC,
                        unit: 'mg'
                    }
                }
            };
        } catch (error) {
            throw logError('getTodaysDietPage', error, { userId, date });
        }
     }
}

module.exports = DietPageService;