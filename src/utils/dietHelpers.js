/**
 * Validates a date string in YYYY-MM-DD format
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const validateDate = (dateStr) => {
    // Check basic format using regex
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return false;
    }

    // Check if it's a valid date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return false;
    }

    // Check if the date string matches what we'd get from a valid date
    // This ensures things like "2024-13-45" are caught
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return dateStr === `${year}-${month}-${day}`;
};

/**
 * Calculates nutrition totals from an array of meals
 * @param {Array} meals - Array of meal objects with nutrition information
 * @returns {Object} - Object containing nutrition totals
 */
const calculateNutritionTotals = (meals) => {
    const initTotals = {
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fats: 0,
        fibre: 0,
        calcium: 0,
        iron: 0,
        sodium: 0,
        vitamin_a: 0,
        vitamin_b6: 0,
        vitamin_b12: 0,
        vitamin_c: 0,
        vitamin_d: 0,
        water: 0
    };

    if (!Array.isArray(meals)) {
        return initTotals;
    }

    return meals.reduce((totals, mealEntry) => {
        // Check if meal exists and has nutrition data
        const meal = mealEntry?.meal;
        if (!meal) return totals;

        // Helper function to safely add nutritional values
        const safeAdd = (current, addition) => {
            const value = parseFloat(addition);
            return current + (isNaN(value) ? 0 : value);
        };

        // Update all nutritional values
        Object.keys(totals).forEach(nutrient => {
            totals[nutrient] = safeAdd(totals[nutrient], meal[nutrient]);
        });

        return totals;
    }, initTotals);
};

/**
 * Formats nutrition values to fixed decimal places
 * @param {Object} nutritionValues - Object containing nutrition values
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {Object} - Object with formatted nutrition values
 */
const formatNutritionValues = (nutritionValues, decimals = 1) => {
    const formatted = {};
    
    Object.entries(nutritionValues).forEach(([key, value]) => {
        formatted[key] = Number(parseFloat(value).toFixed(decimals));
    });

    return formatted;
};

/**
 * Calculates BMR (Basal Metabolic Rate) using Harris-Benedict equation
 * @param {Object} params - Parameters for BMR calculation
 * @param {number} params.weight - Weight in kg
 * @param {number} params.height - Height in cm
 * @param {number} params.age - Age in years
 * @param {string} params.gender - 'male' or 'female'
 * @returns {number} - BMR value
 */
const calculateBMR = ({ weight, height, age, gender }) => {
    if (gender.toLowerCase() === 'male') {
        return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    }
    return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
};

/**
 * Calculates daily calorie needs based on activity level
 * @param {number} bmr - Basal Metabolic Rate
 * @param {string} activityLevel - Activity level description
 * @returns {number} - Daily calorie needs
 */
const calculateDailyCalorieNeeds = (bmr, activityLevel) => {
    const activityMultipliers = {
        sedentary: 1.2,        // Little or no exercise
        lightlyActive: 1.375,  // Light exercise 1-3 times/week
        moderatelyActive: 1.55,// Moderate exercise 3-5 times/week
        veryActive: 1.725,     // Hard exercise 6-7 times/week
        extraActive: 1.9       // Very hard exercise & physical job or training twice/day
    };

    const multiplier = activityMultipliers[activityLevel] || activityMultipliers.sedentary;
    return bmr * multiplier;
};

const formatDayMeals = (dayMeals = {}) => {
    return {
        breakfast: dayMeals?.breakfast || [],
        morningSnack: dayMeals?.morningSnack || [],
        lunch: dayMeals?.lunch || [],
        eveningSnack: dayMeals?.eveningSnack || [],
        dinner: dayMeals?.dinner || [],
        preWorkout: dayMeals?.preWorkout || [],
        postWorkout: dayMeals?.postWorkout || []
    };
}

module.exports = {
    validateDate,
    calculateNutritionTotals,
    formatNutritionValues,
    calculateBMR,
    calculateDailyCalorieNeeds,
    formatDayMeals
};