const axios = require('axios');
const { logError } = require('../../utils/logError');
const MealService = require('../FoodService/MealService');
const {getAccessToken} = require('../../utils/serviceAccountKey');

class FoodService {

    static formatFoodAnalysisResponse(rawResponse) {
        try {
          // Extract food predictions
          const predictions = rawResponse.predictions || [];
          
          // Format each prediction into a structured response
          const formattedData = predictions.map(prediction => {
            // If prediction is already a string (as in your current implementation)
            if (typeof prediction === 'string') {
              return {
                description: prediction,
                confidence: 1.0, // Default confidence when not provided
                id: crypto.randomUUID() || `food-${Date.now()}` // Generate a unique ID
              };
            }
            
            // If prediction is an object with more details
            return {
              description: prediction.description || prediction.name || prediction.label || "Unknown food",
              confidence: prediction.confidence || prediction.probability || 1.0,
              id: prediction.id || crypto.randomUUID() || `food-${Date.now()}`
            };
          });
          
          // Return a structured response
          return {
            success: true,
            data: formattedData,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          console.error('Error formatting food analysis response:', error);
          
          // Return a minimal response in case of error
          return {
            success: false,
            data: [],
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      }

    static async getFoodMacros(foodDescription) {
        try {
            console.log(`Fetching macros for: ${foodDescription}`);
    
            const azureEndpoint = process.env.AZURE_ENDPOINT;
            const azureApiKey = process.env.AZURE_API_KEY;
            const azureDeploymentName = process.env.AZURE_DEPLOYMENT_NAME;
            const azureApiVersion = process.env.AZURE_API_VERSION;
    
            if (!azureEndpoint || !azureApiKey || !azureDeploymentName || !azureApiVersion) {
                throw new Error('Missing required Azure configuration');
            }
    
            const requestData = {
                messages: [
                    {
                        role: "system",
                        content: "You are a nutrition expert. Provide nutritional information in a structured, parseable format."
                    },
                    {
                        role: "user",
                        content: `Provide detailed macronutrient information for ${foodDescription}. Your response should be in a simple text format with each value on a new line in this exact order: carbs (g), fats (g), fibre (g), protein (g), calories (kcal), energy (kJ), iron (mg), sodium (mg), calcium (mg), vitaminA (mcg), vitaminB (mg), vitaminC (mg), vitaminD (mcg). Only include the numerical values without units.` 
                    }
                ],
                max_tokens: 200,
                temperature: 0
            };
    
            const response = await axios.post(
                `${azureEndpoint}/openai/deployments/${azureDeploymentName}/chat/completions?api-version=${azureApiVersion}`,
                requestData,
                {
                    headers: {
                        'api-key': `${azureApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
    
            if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
                console.error('Unexpected response structure:', JSON.stringify(response.data));
                throw new Error('Unexpected response from Azure OpenAI');
            }
    
            const parsedMacros = FoodService.parseMacroResponse(response.data.choices[0].message.content, foodDescription);
            return parsedMacros;
        } catch (error) {
            console.error('Macro fetching error:', error);
            
            if (error.response) {
                console.error('Azure API response error:', {
                    status: error.response.status,
                    data: error.response.data
                });
            }
            
            throw new Error(`Failed to fetch food macros: ${error.message}`);
        }
    }

    static parseMacroResponse(responseContent, foodDescription) {
        try {
          console.log(`Parsing macro response for ${foodDescription}:`, responseContent);
          
          // Initialize with food name and default values
          const result = {
            item_name: foodDescription,
            imageUrl: '',
            carbohydrates: '0',
            protein: '0',
            fats: '0',
            monounsaturated_fats: '0',
            polyunsaturated_fats: '0',
            saturated_fats: '0',
            trans_fats: '0',
            fibre: '0',
            sugars: '0',
            calcium: '0',
            calories: '0',
            iron: '0',
            energy: '0',
            magnesium: '0',
            phosphorus: '0',
            potassium: '0',
            sodium: '0',
            zinc: '0',
            copper: '0',
            manganese: '0',
            iodine: '0',
            vitamin_a: '0',
            vitamin_b6: '0',
            vitamin_b12: '0',
            vitamin_c: '0',
            vitamin_d: '0',
            vitamin_e: '0',
            vitamin_k: '0',
            caffeine: '0',
            cholesterol: '0',
            serving_size: '100',  // Default serving size of 100g
            serving_size_uom: 'g',
            household_serving_size: '1',
            household_serving_size_uom: 'serving'
          };
          
          // Clean up the response content
          let cleanContent = responseContent.trim();
          
          // Try to parse based on different possible formats
          
          // Format 1: Line-by-line values (as requested in your prompt)
          if (cleanContent.includes('\n')) {
            const lines = cleanContent.split('\n').map(line => line.trim());
            const macroNames = [
              'carbohydrates', 'fats', 'fibre', 'protein', 'calories', 'energy', 
              'iron', 'sodium', 'calcium', 'vitamin_a', 'vitamin_b', 'vitamin_c', 'vitamin_d'
            ];
            
            lines.forEach((line, index) => {
              if (index < macroNames.length) {
                // Extract numeric values only
                const numericValue = line.replace(/[^\d.]/g, '');
                if (numericValue && !isNaN(parseFloat(numericValue))) {
                  result[macroNames[index]] = numericValue;
                }
              }
            });
          }
          
          // Format 2: Key-value pairs (e.g., "Carbs: 40g")
          else if (cleanContent.includes(':')) {
            const mappings = {
              'carb': 'carbohydrates',
              'carbs': 'carbohydrates',
              'carbohydrate': 'carbohydrates',
              'carbohydrates': 'carbohydrates',
              'fat': 'fats',
              'fats': 'fats',
              'fiber': 'fibre',
              'fibre': 'fibre',
              'protein': 'protein',
              'calorie': 'calories',
              'calories': 'calories',
              'energy': 'energy',
              'iron': 'iron',
              'sodium': 'sodium',
              'calcium': 'calcium',
              'vitamin a': 'vitamin_a',
              'vitamin b': 'vitamin_b6',  // Simplification, could be more detailed
              'vitamin c': 'vitamin_c',
              'vitamin d': 'vitamin_d',
              'cholesterol': 'cholesterol',
              'sugar': 'sugars',
              'sugars': 'sugars'
            };
            
            const pairs = cleanContent.split(/[,\n]/).map(pair => pair.trim());
            
            pairs.forEach(pair => {
              if (pair.includes(':')) {
                const [key, value] = pair.split(':').map(part => part.trim().toLowerCase());
                
                // Find the matching field
                for (const [searchTerm, fieldName] of Object.entries(mappings)) {
                  if (key.includes(searchTerm)) {
                    // Extract numeric value
                    const numericValue = value.replace(/[^\d.]/g, '');
                    if (numericValue && !isNaN(parseFloat(numericValue))) {
                      result[fieldName] = numericValue;
                    }
                    break;
                  }
                }
              }
            });
          }
          
          // Format 3: JSON-like structure
          else if (cleanContent.includes('{') && cleanContent.includes('}')) {
            try {
              // Try to extract JSON-like content
              const jsonMatch = cleanContent.match(/{[^}]+}/);
              if (jsonMatch) {
                // Convert to valid JSON by adding quotes around keys
                const validJson = jsonMatch[0]
                  .replace(/(\w+):/g, '"$1":')
                  .replace(/'/g, '"');
                  
                const parsedData = JSON.parse(validJson);
                
                // Map fields
                if (parsedData.carbs || parsedData.carbohydrates) 
                  result.carbohydrates = String(parsedData.carbs || parsedData.carbohydrates || 0);
                if (parsedData.fats || parsedData.fat) 
                  result.fats = String(parsedData.fats || parsedData.fat || 0);
                if (parsedData.fiber || parsedData.fibre) 
                  result.fibre = String(parsedData.fiber || parsedData.fibre || 0);
                if (parsedData.protein) 
                  result.protein = String(parsedData.protein || 0);
                if (parsedData.calories || parsedData.calorie) 
                  result.calories = String(parsedData.calories || parsedData.calorie || 0);
                // And so on for other nutrients...
              }
            } catch (jsonError) {
              console.warn('Failed to parse JSON-like structure:', jsonError);
            }
          }
          
          // If we still don't have values, attempt to extract numbers with units
          if (result.calories === '0' && result.carbohydrates === '0') {
            const nutrientRegex = {
              calories: /(\d+(?:\.\d+)?)\s*(?:kcal|calories)/i,
              carbohydrates: /(\d+(?:\.\d+)?)\s*(?:g|grams)?\s*(?:carb|carbs|carbohydrates)/i,
              protein: /(\d+(?:\.\d+)?)\s*(?:g|grams)?\s*protein/i,
              fats: /(\d+(?:\.\d+)?)\s*(?:g|grams)?\s*(?:fat|fats)/i,
              fibre: /(\d+(?:\.\d+)?)\s*(?:g|grams)?\s*(?:fiber|fibre)/i
            };
            
            for (const [nutrient, regex] of Object.entries(nutrientRegex)) {
              const match = cleanContent.match(regex);
              if (match && match[1]) {
                result[nutrient] = match[1];
              }
            }
          }
          
          console.log('Parsed macro data:', result);
          return result;
        } catch (error) {
          console.error('Error parsing macro response:', error);
          // Return default object with food name but zeros for nutrients
          return {
            item_name: foodDescription,
            imageUrl: '',
            carbohydrates: '0',
            protein: '0',
            fats: '0',
            // ... other fields with '0' values
          };
        }
      }
    
static async analyzeFoodWithMacros(imageBase64, userId, context = {}) {
    try {
        context.info?.('Starting food analysis with macros', { 
            userId,
            imageSize: imageBase64?.length || 0,
            imagePrefix: imageBase64?.substring(0, 30) || 'empty'
        });

        // Validate and preprocess image before analysis
        const validatedImage = await this.validateAndPreprocessImage(imageBase64, context);
        
        const foodAnalysis = await this.analyzeFoodImage(validatedImage, context);
        if (!foodAnalysis.data || !foodAnalysis.data[0]) {
            context.error?.('Food analysis returned empty result', { foodAnalysis });
            throw new Error('Failed to analyze food image');
        }

        const foodDescription = foodAnalysis.data[0].description;
        const macros = await this.getFoodMacros(foodDescription, context);
        
        const mealType = this.determineMealType();
        
        context.info?.('Food analysis completed successfully', { 
            foodDescription, 
            mealType,
            macrosFound: !!macros 
        });

        return {macros, mealType};
    } catch (error) {
        context.error?.('analyzeFoodWithMacros failed', { 
            error: error.message,
            userId,
            imageProvided: !!imageBase64
        });
        throw logError('analyzeFoodWithMacros', error);
    }
}

static async validateAndPreprocessImage(imageBase64, context = {}) {
    try {
        if (!imageBase64) {
            throw new Error('No image data provided');
        }

        // Check if it's already a data URI
        let base64Data;
        if (imageBase64.startsWith('data:')) {
            base64Data = imageBase64.split(',')[1];
        } else {
            base64Data = imageBase64;
        }

        // Validate base64 format
        if (!base64Data || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
            context.error?.('Invalid base64 format', { 
                length: base64Data?.length || 0,
                firstChars: base64Data?.substring(0, 20) || 'none'
            });
            throw new Error('Invalid base64 image data');
        }

        // Convert base64 to buffer for validation
        let imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Validate image format and get any offset for corruption
        const imageInfo = this.detectImageFormat(imageBuffer, context);
        
        // Clean corrupted data if offset is found (mobile upload fix)
        if (imageInfo.offset > 0) {
            context.warn?.('Cleaning corrupted image data', { 
                originalSize: imageBuffer.length,
                removingBytes: imageInfo.offset 
            });
            
            // Remove the corrupted prefix bytes
            imageBuffer = imageBuffer.slice(imageInfo.offset);
            
            // Convert back to base64
            base64Data = imageBuffer.toString('base64');
            
            context.info?.('Image data cleaned', { 
                newSize: imageBuffer.length,
                newBase64Length: base64Data.length 
            });
        }
        
        context.info?.('Image validation passed', {
            format: imageInfo.format,
            bufferSize: imageBuffer.length,
            base64Size: base64Data.length,
            wasCleaned: imageInfo.offset > 0
        });

        // Return properly formatted data URI
        const mimeType = imageInfo.format === 'PNG' ? 'image/png' : 'image/jpeg';
        return `data:${mimeType};base64,${base64Data}`;

    } catch (error) {
        context.error?.('Image validation failed', { error: error.message });
        throw new Error(`Image validation failed: ${error.message}`);
    }
}

static detectImageFormat(buffer, context = {}) {
    if (!buffer || buffer.length < 8) {
        throw new Error('Image buffer too small');
    }

    const firstBytes = Array.from(buffer.slice(0, 8)).map(b => b.toString(16)).join(' ');
    context.debug?.('Analyzing magic bytes', { firstBytes });

    // Check for corrupted JPEG (mobile upload issue - CRLF prefix)
    // Look for JPEG signature starting at different offsets
    for (let offset = 0; offset <= 4; offset++) {
        if (buffer.length > offset + 2 &&
            buffer[offset] === 0xFF && 
            buffer[offset + 1] === 0xD8 && 
            buffer[offset + 2] === 0xFF) {
            
            if (offset > 0) {
                context.warn?.('Found corrupted JPEG with prefix bytes', { 
                    offset,
                    prefixBytes: Array.from(buffer.slice(0, offset)).map(b => b.toString(16)).join(' ')
                });
            }
            
            context.debug?.('Detected JPEG format', { 
                offset,
                magicBytes: `${buffer[offset].toString(16)} ${buffer[offset + 1].toString(16)} ${buffer[offset + 2].toString(16)}`
            });
            return { format: 'JPEG', offset };
        }
    }

    // Check PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        context.debug?.('Detected PNG format', { 
            magicBytes: `${buffer[0].toString(16)} ${buffer[1].toString(16)} ${buffer[2].toString(16)} ${buffer[3].toString(16)}`
        });
        return { format: 'PNG', offset: 0 };
    }

    // Check WebP magic bytes (52 49 46 46 ... 57 45 42 50)
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        context.debug?.('Detected WebP format');
        return { format: 'WEBP', offset: 0 };
    }

    context.error?.('Unknown image format', { firstBytes });
    throw new Error(`Unsupported image format. Magic bytes: ${firstBytes}`);
}

static async analyzeFoodImage(imageDataUri, context = {}) {
    try {
        context.info?.('Starting Azure OpenAI Vision analysis', {
            imageLength: imageDataUri?.length || 0,
            mimeType: imageDataUri?.substring(0, 30) || 'unknown'
        });

        // Validate required environment variables
        const azureEndpoint = process.env.AZURE_ENDPOINT;
        const azureApiKey = process.env.AZURE_API_KEY;
        const azureDeploymentName = process.env.AZURE_DEPLOYMENT_NAME;
        const azureApiVersion = process.env.AZURE_API_VERSION;

        if (!azureEndpoint || !azureApiKey || !azureDeploymentName || !azureApiVersion) {
            context.error?.('Missing Azure configuration');
            throw new Error('Missing required Azure configuration');
        }

        const data = {
            messages: [
                { 
                    role: "system", 
                    content: "You are a medical professional specializing in scanning food images and providing accurate nutritional analysis." 
                },
                {
                    role: "user",
                    content: [
                        { 
                            type: "text", 
                            text: "What food item is in this image? Provide only the name of the food." 
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageDataUri
                            }
                        }
                    ]
                }
            ],
            max_tokens: 2048,
            temperature: 0.1,
            top_p: 0.1
        };

        context.debug?.('Sending request to Azure', {
            endpoint: azureEndpoint,
            deployment: azureDeploymentName,
            payloadSize: JSON.stringify(data).length
        });

        const response = await axios.post(
            `${azureEndpoint}/openai/deployments/${azureDeploymentName}/chat/completions?api-version=${azureApiVersion}`,
            data,
            {
                headers: {
                    'api-key': azureApiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            }
        );

        // Validate response structure
        if (!response.data?.choices?.[0]?.message?.content) {
            context.error?.('Invalid Azure API response structure', { 
                responseKeys: Object.keys(response.data || {}),
                choicesLength: response.data?.choices?.length || 0
            });
            throw new Error('Unexpected response from Azure OpenAI');
        }

        const foodDescription = response.data.choices[0].message.content.trim();
        
        context.info?.('Food identified successfully', { 
            foodDescription,
            responseTokens: response.data.usage?.total_tokens || 'unknown'
        });

        return FoodService.formatFoodAnalysisResponse({ predictions: [foodDescription] });
        
    } catch (error) {
        const errorDetails = {
            message: error.message,
            isAxiosError: !!error.response,
            isTimeout: error.code === 'ECONNABORTED',
            imageProvided: !!imageDataUri
        };

        if (error.response) {
            errorDetails.status = error.response.status;
            errorDetails.statusText = error.response.statusText;
            
            // Log specific Azure error details
            if (error.response.data?.error) {
                errorDetails.azureError = {
                    code: error.response.data.error.code,
                    message: error.response.data.error.message
                };
            }
        }

        context.error?.('Azure Vision API call failed', errorDetails);
        
        // Provide more specific error messages
        if (error.response?.status === 400) {
            if (error.response.data?.error?.message?.includes('Invalid image data')) {
                throw new Error('Image format not supported by Azure Vision API. Please try a different image.');
            }
            throw new Error(`Invalid request to Azure API: ${error.response.data?.error?.message || 'Unknown error'}`);
        }
        
        if (error.response?.status === 429) {
            throw new Error('Azure API rate limit exceeded. Please try again later.');
        }
        
        if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout. Please try again with a smaller image.');
        }
        
        throw new Error(`Failed to analyze food image: ${error.message}`);
    }
}
    
    /**
     * Determines the meal type based on the current time of day
     * @returns {string} Meal type: 'breakfast_meal', 'lunch_meal', 'evening_snack', or 'dinner_meal'
     */
    static determineMealType() {
        const currentHour = new Date().getHours();
        
        // Define time ranges for different meals
        if (currentHour >= 5 && currentHour < 11) {
            return 'breakfast_meal';
        } else if (currentHour >= 11 && currentHour < 15) {
            return 'lunch_meal';
        } else if (currentHour >= 15 && currentHour < 18) {
            return 'evening_snack';
        } else {
            return 'dinner_meal'; // Dinner for 18-5 (includes late night)
        }
    }
}

module.exports = FoodService;