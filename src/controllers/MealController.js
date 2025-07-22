const FoodLensService = require('../services/FoodService/FoodLensService');
const MealService = require('../services/FoodService/MealService');
const { logError } = require('../utils/logError');

class MealController {

    analyzeFoodImage = async (request, context) => {
        try {
            if (!request.files || !request.files.file) {
                return {
                    status: 403,
                    jsonBody: {
                        code: 0,
                        data: "Upload Image"
                    }
                };
            }

            const image = request.files.file.data;
            const base64data = Buffer.from(image).toString('base64');

            const result = await FoodLensService.analyzeFoodImage(base64data);

            return {
                status: 200,
                jsonBody: {
                    code: 1,
                    msg: 'SUCCESS',
                    data: result
                }
            };
        } catch (error) {
            const err = logError('analyzeFoodImage', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    code: 0,
                    msg: "ERROR",
                    err: err.message
                }
            };
        }
    }

    analyzeFoodImageWithMacros = async (request, context) => {
        try {
            context.log("=== START: analyzeFoodImageWithMacros ===");
            
            const userId = context.user?._id;
            context.log("User ID:", userId);

            if (!userId) {
                context.log("ERROR: User not authenticated");
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            // Enhanced request validation with detailed logging
            context.log("Request structure:");
            context.log("- request.files exists:", !!request.files);
            context.log("- request.files keys:", request.files ? Object.keys(request.files) : 'N/A');
            context.log("- request.body exists:", !!request.body);
            context.log("- request.body keys:", request.body ? Object.keys(request.body) : 'N/A');
            
            // Check for different possible file locations
            if (request.files) {
                context.log("Files object content:");
                Object.keys(request.files).forEach(key => {
                    const file = request.files[key];
                    context.log(`- ${key}:`, {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        hasData: !!file.data,
                        dataType: typeof file.data,
                        dataConstructor: file.data?.constructor?.name,
                        dataLength: file.data?.length
                    });
                });
            }

            if (!request.files || !request.files.file) {
                context.log("ERROR: No file found in request");
                context.log("Available request properties:", Object.keys(request));
                return {
                    status: 403,
                    jsonBody: {
                        code: 0,
                        data: "Upload Image"
                    }
                };
            }

            const image = request.files.file.data;
            const fileInfo = request.files.file;
            
            context.log("=== FILE ANALYSIS ===");
            context.log("File name:", fileInfo.name);
            context.log("File size:", fileInfo.size);
            context.log("File type:", fileInfo.type);
            context.log("Image data type:", typeof image);
            context.log("Image data constructor:", image?.constructor?.name);
            context.log("Image data length:", image?.length);
            context.log("Is Buffer:", Buffer.isBuffer(image));
            context.log("Is ArrayBuffer:", image instanceof ArrayBuffer);
            context.log("Is Uint8Array:", image instanceof Uint8Array);

            // Check if image data is valid
            if (!image || image.length === 0) {
                context.log("ERROR: Image data is empty or invalid");
                return {
                    status: 400,
                    jsonBody: {
                        code: 0,
                        msg: "Invalid image data"
                    }
                };
            }

            // Enhanced base64 conversion with logging
            context.log("=== BASE64 CONVERSION ===");
            let base64data;
            
            try {
                if (Buffer.isBuffer(image)) {
                    context.log("Converting Buffer to base64");
                    base64data = image.toString('base64');
                } else if (image instanceof ArrayBuffer) {
                    context.log("Converting ArrayBuffer to base64");
                    base64data = Buffer.from(image).toString('base64');
                } else if (image instanceof Uint8Array) {
                    context.log("Converting Uint8Array to base64");
                    base64data = Buffer.from(image).toString('base64');
                } else if (typeof image === 'string') {
                    context.log("Image data is already string, checking if base64");
                    // Check if it's already base64
                    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
                    if (base64Regex.test(image)) {
                        context.log("String appears to be valid base64");
                        base64data = image;
                    } else {
                        context.log("String is not base64, converting");
                        base64data = Buffer.from(image).toString('base64');
                    }
                } else {
                    context.log("Unknown image data type, attempting Buffer conversion");
                    base64data = Buffer.from(image).toString('base64');
                }
            } catch (conversionError) {
                context.log("ERROR during base64 conversion:", conversionError.message);
                throw new Error(`Base64 conversion failed: ${conversionError.message}`);
            }

            context.log("Base64 conversion successful");
            context.log("Base64 Data length:", base64data.length);
            context.log("Base64 Data preview (first 50 chars):", base64data.substring(0, 50) + '...');
            context.log("Base64 Data preview (last 50 chars):", '...' + base64data.substring(base64data.length - 50));

            // Validate base64 format
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            if (!base64Regex.test(base64data)) {
                context.log("ERROR: Invalid base64 format generated");
                context.log("Base64 sample for debugging:", base64data.substring(0, 100));
                throw new Error('Invalid base64 format generated');
            }
            context.log("Base64 format validation passed");

            // Call the analysis service
            context.log("=== CALLING FOOD ANALYSIS SERVICE ===");
            const { macros: resultmacros, mealType } = await FoodLensService.analyzeFoodWithMacros(base64data, userId, context);
            
            context.log("Analysis completed successfully");
            context.log("Meal type:", mealType);
            context.log("Macros keys:", resultmacros ? Object.keys(resultmacros) : 'null');

            return {
                status: 200,
                jsonBody: {
                    code: 1,
                    msg: 'SUCCESS',
                    data: resultmacros,
                    mealType: mealType
                }
            };
        } catch (error) {
            context.log("=== ERROR in analyzeFoodImageWithMacros ===");
            context.log("Error message:", error.message);
            context.log("Error stack:", error.stack);
            
            const err = logError('analyzeFoodImageWithMacros', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    code: 0,
                    msg: "ERROR",
                    err: err.message
                }
            };
        }
    }

    searchMeal = async (request, context) => {
        try {
            const { query } = request.query || {};
            const result = await MealService.searchFood(query);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result
                }
            };
        } catch (error) {
            const err = logError('searchMeal', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error searching meals',
                    error: err.message
                }
            };
        }
    }

    addAndUpdateMeal = async (request, context) => {
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

            const { meal, quantity, mealType } = await request.json() || {};
            context.log("body,", meal, mealType, quantity);

            if (!meal) {
                return {
                    status: 400,
                    jsonBody: {
                        code: 0,
                        msg: "BAD_REQUEST",
                        error: "ENTER MEAL"
                    }
                };
            }

            const result = await MealService.addAndUpdateMeal(userId, meal, mealType, quantity);

            return {
                status: 200,
                jsonBody: {
                    code: 1,
                    success: true,
                    data: result,
                    message: "Meal Added successfully"
                }
            };
        } catch (error) {
            context.log("error", error);
            const err = logError('addAndUpdateMeal', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    code: 0,
                    msg: "ERROR",
                    error: err.message
                }
            };
        }
    }

    getFoodById = async (request, context) => {
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

            const { foodId } = request.query || {};
            const result = await MealService.getFoodById(foodId);

            return {
                status: 200,
                jsonBody: result
            };
        } catch (error) {
            context.error('Error fetching meal:', error);
            const err = logError('getFoodById', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'An error occurred while fetching the meal',
                    error: err.message
                }
            };
        }
    }

    getMealById = async (request, context) => {
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

            const { mealId } = request.query || {};
            const result = await MealService.getMealById(mealId);

            return {
                status: 200,
                jsonBody: result
            };
        } catch (error) {
            context.error('Error fetching meal:', error);
            const err = logError('getMealById', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'An error occurred while fetching the meal',
                    error: err.message
                }
            };
        }
    }

    updateMeal = async (request, context) => {
        try {
            const { meal } = await request.json() || {};
            const result = await MealService.updateMeal(meal);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: "Meal Updated Successfully."
                }
            };
        } catch (error) {
            context.error('Error updating meal:', error);
            const err = logError('updateMeal', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'An error occurred while updating the meal',
                    error: err.message
                }
            };
        }
    }

    getDateMeals = async (request, context) => {
        try {
            const userId = context.user?._id;
            const { date } = request.query || {};

            // Validate user authentication
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            // Validate date parameter
            if (!date) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Date parameter is required'
                    }
                };
            }

            const currentDate = new Date(date);

            // Validate date format
            if (isNaN(currentDate.getTime())) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Invalid date format'
                    }
                };
            }

            const result = await MealService.getDateMeals(userId, currentDate);

            // Check if any meals were found
            const isEmpty = Object.values(result).every(meals =>
                Array.isArray(meals) && meals.length === 0
            );

            if (isEmpty) {
                return {
                    status: 200,
                    jsonBody: {
                        success: 0,
                        data: result,
                        message: "No meals found for the given date."
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: 1,
                    data: result,
                    message: "Successfully retrieved meals."
                }
            };

        } catch (error) {
            context.error('Error in getDateMeals:', error);
            const err = logError('getDateMeals', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error fetching meals',
                    error: err.message
                }
            };
        }
    }

    getTodayMeals = async (request, context) => {
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

            // Set up today's date range in user's timezone
            const now = new Date(date);

            const result = await MealService.getDailyMeals(userId, now);

            if (result.meals.length == 0) {
                return {
                    status: 200,
                    jsonBody: {
                        success: 0,
                        data: result,
                        message: "No Daily Meal Found."
                    }
                };
            } else {
                return {
                    status: 200,
                    jsonBody: {
                        success: 1,
                        data: result,
                        message: "Successfully Retrieved Daily Meals."
                    }
                };
            }

        } catch (error) {
            context.error('Error in getTodayMeals:', error);
            const err = logError('getTodayMeals', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error fetching today\'s meals',
                    error: err.message
                }
            };
        }
    }

    getPreferredMeals = async (request, context) => {
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

            const result = await MealService.getPreferredMeals(userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: "Successfully Retrieved Preferred Meals."
                }
            };

        } catch (error) {
            context.error('Error in getPreferredMeals:', error);
            const err = logError('getPreferredMeals', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error fetching preferred meals',
                    error: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new MealController();