const mealModel = require('../../models/meal');
const foodModel = require('../../models/food');
const food = require('../../models/food');
const StreakService = require('../StreakService');

class MealService {

    static convertFoodDataToString = (foodData) => {
        const keysToConvert = [
            'food_count', 'carbohydrates', 'monounsaturated_fats', 
            'polyunsaturated_fats', 'saturated_fats', 'trans_fats',
            'fibre', 'sugars', 'calcium', 'iron', 'magnesium',
            'phosphorus', 'potassium', 'sodium', 'zinc', 'copper',
            'iodine', 'vitamin_a', 'vitamin_b6', 'vitamin_b12',
            'vitamin_c', 'vitamin_d', 'vitamin_e', 'vitamin_k',
            'caffeine', 'cholesterol', 'serving_size',
            'household_serving_size', 'energy'
        ];
    
        const convertedData = { ...foodData };
    
        // Convert _id to string if it exists and is an ObjectId
        if (convertedData._id) {
            convertedData._id = convertedData._id.toString();
        }
    
        // Convert numeric fields to strings
        keysToConvert.forEach(key => {
            if (key in convertedData && convertedData[key] !== null) {
                convertedData[key] = convertedData[key].toString();
            }
        });
    
        return convertedData;
    };
    
    // For an array of food data
    static convertFoodListToString = (foodList) => {
        return foodList.map(food => this.convertFoodDataToString(food));
    };
    static async searchFood(query) {
        if (!query) {
            return { code: 1, data: [] };
        }

        const data = await foodModel.find({
            item_name: { $regex: query, $options: 'i' }
        })
        .lean()
        .limit(10)
        .sort({ food_count: -1 });
        
        const convertedFoods = this.convertFoodListToString(data);
        return !data.length > 0 
            ? { code: 0, data: [], message: 'food not found' }
            : { code: 1, meals: convertedFoods };
    }

    static async addAndUpdateMeal(userId, meal, mealType, quantity = 1) {
        
        let savedFood = null;
        const {
            item_name, imageUrl, carbohydrates, protein, fats, fibre, sugars, calcium,
            calories, iron, energy, potassium, sodium, vitamin_a, vitamin_b6, vitamin_b12,
            vitamin_c, vitamin_d, vitamin_e, cholesterol, serving_size, serving_size_uom,
            household_serving_size, household_serving_size_uom
        } = meal;
        console.log("meal", meal);
        const normalizedItemName = meal.item_name ? meal.item_name.trim().toLowerCase() : '';
        console.log("normalizeditemname", normalizedItemName);
        // Find food item with lowercase comparison
        const food = await foodModel.findOne({
            // Convert stored item_name to lowercase for comparison
            $expr: {
                $eq: [
                    { $toLower: '$item_name' },
                    normalizedItemName
                ]
            }
        });
        if(!food)
        {
            let foodCount = await foodModel.findOne().sort({food_count:-1});
            if(!foodCount) {
                foodCount = { food_count: 0 };
            }
            console.log("count",foodCount);
            // Convert numeric string values to proper format
            const numericFields = [
                'carbohydrates', 'protein', 'fats', 'fibre', 'sugars', 'calcium', 'calories', 'iron',
                'energy', 'potassium', 'sodium', 'vitamin_a', 'vitamin_b6', 'vitamin_b12', 'vitamin_c',
                'vitamin_d', 'vitamin_e', 'cholesterol'
            ];
    
            let cleanedMealData = { meal };
            console.log(cleanedMealData);
            numericFields.forEach(field => {
                if (cleanedMealData.meal[field]) {
                    
                    console.log("cleaned",field, cleanedMealData.meal[field]);
                    // Remove any non-numeric characters except decimal point
                    cleanedMealData.meal[field] = cleanedMealData.meal[field].toString().replace(/[^\d.-]/g, '');
                }
            });
    
            // Ensure calories exist by copying from energy if missing
            if (!cleanedMealData.meal.calories && cleanedMealData.meal.energy) {
                cleanedMealData.meal.calories = cleanedMealData.meal.energy;
            }

            console.log("meal", meal);
            const newFood = new foodModel({
                food_count: foodCount.food_count+1,
                item_name,
                imageUrl,
                carbohydrates: cleanedMealData.meal.carbohydrates,
                protein: cleanedMealData.meal.protein,
                fats: cleanedMealData.meal.fats,
                fibre: cleanedMealData.meal.fibre,
                sugars: cleanedMealData.meal.sugars,
                calcium: cleanedMealData.meal.calcium,
                calories: cleanedMealData.meal.calories,
                iron: cleanedMealData.meal.iron,
                energy: cleanedMealData.meal.energy,
                potassium: cleanedMealData.meal.potassium,
                sodium: cleanedMealData.meal.sodium,
                vitamin_a: cleanedMealData.meal.vitamin_a,
                vitamin_b6: cleanedMealData.meal.vitamin_b6,
                vitamin_b12: cleanedMealData.meal.vitamin_b12,
                vitamin_c: cleanedMealData.meal.vitamin_c,
                vitamin_d: cleanedMealData.meal.vitamin_d,
                vitamin_e: cleanedMealData.meal.vitamin_e,
                cholesterol: cleanedMealData.meal.cholesterol,
                serving_size,
                serving_size_uom,
                household_serving_size,
                household_serving_size_uom
            });
            
            savedFood= await newFood.save();
            
        }
        else
        {
            savedFood= food;
        }

        const data = new mealModel({
            userId: userId,
            meal: savedFood._id,
            mealType: mealType,
            isCompleted: true,
            quantity: quantity,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        await data.save();
        await StreakService.syncDietLogStreakData(userId, Date.now());
    }

    static async updateMeal(meal) {
        const updatedMeal = await mealModel.findByIdAndUpdate(
            meal?.id,
            {
                quantity: meal?.quantity,
                mealType: meal?.mealType 
            },
            { new: true }
        );
        
        if (!updatedMeal) {
            throw new Error('Meal not found');
        }
        
        return updatedMeal;
     }

    static async getFoodById(foodId) {
        const meal = await food.findOne({ _id: foodId });

        if (!meal) {
            return {
                success: false,
                message: 'Meal not found'
            };
        }

        if (!meal.calories && meal.energy) {
            meal.calories = food.energy;
            await meal.save(); // Persist the change
        }
        
        return {
            success: true,
            data: meal,
            message: 'Meal retrieved successfully'
        };
    }

    static async getMealById(mealId) {
        const meal = await mealModel.findById(mealId)
            .populate('meal')
            .exec();

        if (!meal) {
            return {
                success: false,
                message: 'Meal not found'
            };
        }

        if (!meal.calories && meal.energy) {
            meal.calories = food.energy;
            await meal.save(); // Persist the change
        }
        
        return {
            success: true,
            data: meal,
            message: 'Meal retrieved successfully'
        };
    }

    static async getDailyMeals(userId, date) {
        try {
            const today = new Date(date);
            // Adjust start of the day in Mauritius to UTC
            const startOfDay = new Date(today.getTime());
            startOfDay.setUTCHours(0, 0, 0, 0);
            
            // Adjust end of the day in Mauritius to UTC
            const endOfDay = new Date(today.getTime());
            endOfDay.setUTCHours(23, 59, 59, 999);

            // Find meals created or updated today
            const meals = await mealModel.find({
                userId,
                $or: [
                    { createdAt: { $gte: startOfDay, $lte: endOfDay } },
                    { updatedAt: { $gte: startOfDay, $lte: endOfDay } }
                ]
            }).populate({
                path: 'meal',
                model: 'foods',
                select: '-food_count -createdAt -updatedAt'
            }).sort({ createdAt: -1 });

            if(meals.length == 0) {
                return {
                    success: true,
                    date: date,
                    totalMeals: meals.length,
                    dailyTotals: {
                        calories: 0,
                        protein: 0,
                        carbohydrates: 0,
                        fats: 0,
                        iron: 0,
                        calcium: 0,
                        vitamin_d: 0,
                        vitamin_c: 0,
                        fibre: 0
                    },
                    meals: []
                };
            }
    
            // Calculate nutrition totals for essential nutrients only
            const dailyTotals = meals.reduce((totals, meal) => {
                if (meal.meal) {
                    console.log("mealtype", meal);

                    // Essential macronutrients
                    totals.calories += ((meal.meal.calories ? parseFloat(meal.meal.calories || 0) : parseFloat(meal.meal.energy || 0))* meal.quantity);
                    console.log("totals", totals.calories);
                    totals.protein += parseFloat(meal.meal.protein || 0);
                    totals.carbohydrates += parseFloat(meal.meal.carbohydrates || 0);
                    totals.fats += parseFloat(meal.meal.fats || 0) + 
                                  parseFloat(meal.meal.monounsaturated_fats || 0) + 
                                  parseFloat(meal.meal.polyunsaturated_fats || 0) + 
                                  parseFloat(meal.meal.saturated_fats || 0) + 
                                  parseFloat(meal.meal.trans_fats || 0);
                    
                    // Essential micronutrients
                    totals.iron += parseFloat(meal.meal.iron || 0);
                    totals.calcium += parseFloat(meal.meal.calcium || 0);
                    totals.vitamin_d += parseFloat(meal.meal.vitamin_d || 0);
                    totals.vitamin_c += parseFloat(meal.meal.vitamin_c || 0);
                    totals.fibre += parseFloat(meal.meal.fibre || 0);
                    
                }
                return totals;
            }, {
                calories: 0,
                protein: 0,
                carbohydrates: 0,
                fats: 0,
                iron: 0,
                calcium: 0,
                vitamin_d: 0,
                vitamin_c: 0,
                fibre: 0
            });
    
            // Keep the existing formattedMeals mapping as it is (it includes all nutrients)
            const formattedMeals = meals.map(meal => ({
                id: meal._id,
                timeConsumed: meal.createdAt,
                mealHits: meal.mealHits,
                foodDetails: {
                    name: meal.meal?.item_name,
                    servingSize: meal.meal?.serving_size,
                    servingSizeUom: meal.meal?.serving_size_uom,
                    nutrition: {
                        calories: meal.meal?.calories ? meal.meal?.calories : meal.meal?.energy,
                        protein: meal.meal?.protein,
                        carbohydrates: meal.meal?.carbohydrates,
                        fats: parseFloat(meal.meal.fats || 0) + 
                              parseFloat(meal.meal.monounsaturated_fats || 0) + 
                              parseFloat(meal.meal.polyunsaturated_fats || 0) + 
                              parseFloat(meal.meal.saturated_fats || 0) + 
                              parseFloat(meal.meal.trans_fats || 0),
                        iron: meal.meal?.iron,
                        calcium: meal.meal?.calcium,
                        vitamin_d: meal.meal?.vitamin_d,
                        vitamin_b12: meal.meal?.vitamin_b12,
                        // Keep other nutrients in individual meal data
                        magnesium: meal.meal?.magnesium,
                        phosphorus: meal.meal?.phosphorus,
                        potassium: meal.meal?.potassium,
                        sodium: meal.meal?.sodium,
                        zinc: meal.meal?.zinc,
                        copper: meal.meal?.copper,
                        manganese: meal.meal?.manganese,
                        vitamin_a: meal.meal?.vitamin_a,
                        vitamin_b6: meal.meal?.vitamin_b6,
                        vitamin_c: meal.meal?.vitamin_c,
                        vitamin_e: meal.meal?.vitamin_e,
                        vitamin_k: meal.meal?.vitamin_k
                    }
                }
            }));
    
            return {
                success: true,
                date: today.toISOString().split('T')[0],
                totalMeals: meals.length,
                dailyTotals,
                meals: formattedMeals
            };
    
        } catch (error) {
            throw new Error(`Error in getDailyMeals: ${error.message}`);
        }
    }

    static async getDateMeals(userId, date) {
        try {
            const today = new Date(date);
            
            const startOfDay = new Date(today.getTime());
            startOfDay.setUTCHours(0, 0, 0, 0);
            
            const endOfDay = new Date(today.getTime());
            endOfDay.setUTCHours(23, 59, 59, 999);
    
            // Updated query to match schema structure
            const meals = await mealModel.find({
                userId,
                $or: [
                    { createdAt: { $gte: startOfDay, $lte: endOfDay } },
                    { updatedAt: { $gte: startOfDay, $lte: endOfDay } }
                ]
            }).populate({
                path: 'meal',
                model: 'foods',
                select: 'item_name calories protein carbohydrates' 
            }).sort({ createdAt: -1 });
    
            if(meals.length === 0) {
                return {
                    success: true,
                    date: date.toISOString().split('T')[0],
                    breakfast_meal: [],
                    lunch_meal: [],
                    dinner_meal: [],
                    evening_snack: []
                };
            }
    
            // Group meals by meal type according to schema enum values
            const groupedMeals = meals.reduce((acc, meal) => {
                if (!meal.meal) return acc;
    
                const mealData = {
                    _id: meal._id,
                    item_name: meal.meal.item_name,
                    calories: meal.meal.calories || 0,
                    protein: meal.meal.protein || 0,
                    carbohydrates: meal.meal.carbohydrates || 0,
                    quantity: meal.quantity || 1, // Include quantity from schema
                    mealHits: meal.mealHits || 0  // Include mealHits from schema
                };
    
                // Using the exact enum values from schema
                const mealTypeKey = meal.mealType || 'breakfast_meal';
                if (!acc[mealTypeKey]) {
                    acc[mealTypeKey] = [];
                }
                acc[mealTypeKey].push(mealData);
    
                return acc;
            }, {
                breakfast_meal: [],
                lunch_meal: [],
                evening_snack: [],
                dinner_meal: []
            });
    
            return {
                success: true,
                date: today.toISOString().split('T')[0],
                ...groupedMeals
            };
    
        } catch (error) {
            throw new Error(`Error in getDateMeals: ${error.message}`);
        }
    }

    static async getPreferredMeals(userId) {
        try {
            // Find meals created or updated today
            let meals = await mealModel.aggregate([
                { $match: { userId } },
                {
                    $group: {
                        _id: '$meal',  // Group by meal ID to get unique meals
                        mealHits: { $first: '$mealHits' }  // Keep the first mealHits value
                    }
                },
                { $sort: { mealHits: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'foods',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'meal'
                    }
                },
                { $unwind: '$meal' },
                {
                    $project: {
                        'meal._id': 1,
                        'meal.item_name': 1,
                        'meal.calories': 1,
                        'meal.protein': 1,
                        'meal.carbohydrates': 1,
                        'meal.fats': 1,
                        'meal.vitamin_a': 1,
                        'meal.vitamin_c': 1,
                        'meal.calcium': 1,
                        'meal.iron': 1,
                        'meal.serving_size': 1,
                        'meal.serving_size_uom': 1,
                        'meal.household_serving_size': 1,
                        'meal.household_serving_size_uom': 1
                    }
                }
            ]);
            let temp_meals = meals;
            let final_meals = [];
            temp_meals.forEach(item=>{
                final_meals.push(item.meal);
            })
            meals=final_meals;
            
            if(!meals || meals.length == 0)
            {
                 meals = await foodModel.aggregate([
                    { $match: { energy: { $ne: "0" }, item_name: { $ne: "" } } },
                    { $sample: { size: 10 } }
                ]);
            }
            return {
                meals
            };

        } catch (error) {
            throw new Error(`Error in getPrefferedMeals: ${error.message}`);
        }
    }

    static async _parseFoodResponse(response) {
        const rawContent = response.data.choices[0].message.content;
        let fixedJsonString = rawContent.replace(/(\w+):/g, '"$1":');
        const removejsonResponse = fixedJsonString.replace(/```json\n|\n```/g, '');
        const startIndex = removejsonResponse.indexOf('{');
        const endIndex = removejsonResponse.lastIndexOf('}') + 1;
        let cleanResponse=removejsonResponse;
        // Extract just the JSON portion
        if (startIndex !== -1 && endIndex !== -1) {
            cleanResponse =  removejsonResponse.substring(startIndex, endIndex);
        }
        return JSON.parse(cleanResponse);
    }

    static async _saveFoodData(foodData, foodCount) {
        const data = new foodModel({
            food_count: foodCount,
            ...foodData
        });
        return await data.save();
    }

    static async _createAndSaveMeal(userId, foodItem, quantity) {
        const meal = new mealModel({
            userId: userId,
            meal: {
                food_count: foodItem.food_count,
                item_name: foodItem.item_name,
                calcium: foodItem.calcium,
                carbohydrates: foodItem.carbohydrates,
                fibre: foodItem.fibre,
                iron: foodItem.iron,
                protein: foodItem.protein,
                sodium: foodItem.sodium,
                sugars: foodItem.sugars,
                fats:await this._calculateTotalFats(foodItem),
                vitamin_a: foodItem.vitamin_a,
                vitamin_b12: foodItem.vitamin_b12,
                vitamin_b6: foodItem.vitamin_b6,
                vitamin_c: foodItem.vitamin_c,
                vitamin_d: foodItem.vitamin_d,
                water: foodItem.water,
                serving:await this._calculateServing(foodItem),
                quantity: quantity
            }
        });
        return await meal.save();
    }

    static async _calculateServing(item) {
        let calculatedServing = "";

        if (item.serving_size && item.serving_size_uom) {
            calculatedServing += `${item.serving_size} ${item.serving_size_uom}`;
        }

        if (item.household_serving_size && item.household_serving_size_uom) {
            if (calculatedServing) {
                calculatedServing += ` or `;
            }
            calculatedServing += `${item.household_serving_size} ${item.household_serving_size_uom}`;
        }

        return calculatedServing;
    }

    static async _calculateTotalFats(item) {
        const monoFats = parseFloat(item.monounsaturated_fats) || 0;
        const polyFats = parseFloat(item.polyunsaturated_fats) || 0;
        const saturatedFats = parseFloat(item.saturated_fats) || 0;
        const transFats = parseFloat(item.trans_fats) || 0;

        return monoFats + polyFats + saturatedFats + transFats;
    }

    static removeUnits(value) {
        if (!value) return '0';

        // Convert value to string if it isn't already
        const strValue = String(value);

        // Regular expression to match number (including decimals) followed by any unit
        const numericMatch = strValue.match(/^([-+]?\d*\.?\d+)/);
        
        if (numericMatch) {
            return numericMatch[1];
        }

        return '0';
    }

    static formatFoodData(inputData) {
        // Default object structure matching schema
        const formattedData = {
            item_name: inputData.item_name || '',
            imageUrl: '',
            carbohydrates: this.removeUnits(inputData.carbs),
            protein: this.removeUnits(inputData.protein),
            fats: this.removeUnits(inputData.fats),
            monounsaturated_fats: '0',
            polyunsaturated_fats: '0',
            saturated_fats: '0',
            trans_fats: '0',
            fibre: this.removeUnits(inputData.fibre),
            sugars: '0',
            calcium: this.removeUnits(inputData.calcium),
            calories: this.removeUnits(inputData.calories),
            iron: this.removeUnits(inputData.iron),
            energy: this.removeUnits(inputData.energy),
            magnesium: '0',
            phosphorus: '0',
            potassium: '0',
            sodium: this.removeUnits(inputData.sodium),
            zinc: '0',
            copper: '0',
            manganese: '0',
            iodine: '0',
            vitamin_a: this.removeUnits(inputData.vitaminA),
            vitamin_b6: '0',
            vitamin_b12: '0',
            vitamin_c: this.removeUnits(inputData.vitaminC),
            vitamin_d: this.removeUnits(inputData.vitaminD),
            vitamin_e: '0',
            vitamin_k: '0',
            caffeine: '0',
            cholesterol: '0',
            serving_size: inputData.servingSize || '0',
            serving_size_uom: inputData.servingSizeUom || '',
            household_serving_size: '0',
            household_serving_size_uom: ''
        };

        return formattedData;
    }

}

module.exports = MealService;