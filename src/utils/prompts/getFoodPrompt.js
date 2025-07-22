const getFoodData = (itemName, maxTokens) => {
    return {
        messages: [
            {
                role: "system",
                content: `Generate a complete food item data object for ${itemName} with all values as strings, following this exact structure:
                    {
                    food_count: (unique 10-digit identifier),
                    item_name: ${itemName},
                    caffeine: (in mg),
                    calcium: (in mg),
                    carbohydrates: (in g),
                    cholesterol: (in mg),
                    copper: (in mg),
                    energy: (in calories),
                    monounsaturated_fats: (in g),
                    polyunsaturated_fats: (in g),
                    saturated_fats: (in g),
                    trans_fats: (in g),
                    fibre: (in g),
                    folate: (in mcg),
                    iodine: (in mcg),
                    iron: (in mg),
                    magnesium: (in mg),
                    manganese: (in mg),
                    phosphorus: (in mg),
                    potassium: (in mg),
                    protein: (in g),
                    riboflavin: (in mg),
                    sodium: (in mg),
                    sugars: (in g),
                    fats: (total fats in g),
                    vitamin_a: (in IU),
                    vitamin_b12: (in mcg),
                    vitamin_b6: (in mg),
                    vitamin_c: (in mg),
                    vitamin_d: (in IU),
                    vitamin_e: (in mg),
                    vitamin_k: (in mcg),
                    water: (in g),
                    zinc: (in mg),
                    serving_size: (numerical value),
                    serving_size_uom: (unit based on food type - use "bowl" for soups, broths, curries, and liquid dishes; use "plate" for rice dishes, noodles, full meals; use "grams" for solid ingredients and snacks; use "piece" for items like bread, rotis, sandwiches),
                    household_serving_size: (numerical value),
                    household_serving_size_uom: (common household unit based on food type - use "cup" for liquid items; use "piece/slice" for bread, pizza; use "tablespoon" for sauces, spreads; use "bowl" for cereals, soups; use "plate" for main course meals)
                    }

                    Serving size guidelines:
                    1. For liquid-based dishes (soups, broths, curries, dal):
                       - serving_size_uom: "bowl"
                       - typical serving_size: "1"
                    
                    2. For main course meals (rice dishes, noodles, pasta, thali):
                       - serving_size_uom: "plate"
                       - typical serving_size: "1"
                    
                    3. For bread items (roti, naan, sandwich, pizza):
                       - serving_size_uom: "piece"
                       - typical serving_size based on standard portions
                    
                    4. For snacks and solid ingredients:
                       - serving_size_uom: "grams"
                       - typical serving_size based on standard portions
                    
                    5. For beverages:
                       - serving_size_uom: "ml"
                       - typical serving_size based on standard portions

                    Examples:
                    - Tomato Soup: 1 bowl
                    - Chicken Curry: 1 bowl
                    - Vegetable Biryani: 1 plate
                    - Wheat Roti: 1 piece
                    - Mixed Vegetables: 100 grams
                    - Fresh Orange Juice: 250 ml

                    Provide realistic nutritional values typical for this food item, with all numeric values as strings. The values should be consistent with standard nutritional databases.`
            }
        ],
        max_tokens: maxTokens,
        temperature: 1,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: null
    };
};

module.exports = { getFoodData };