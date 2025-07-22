// services/WellnessService.js
const { logError } = require('../utils/logError');
const scoringModel = require('../models/wellness');
const userModel = require('../models/userProfile');
const MealService = require('../services/FoodService/MealService');
const FitnessDataService = require('../services/FitnessDataService');
const FaceScanVitalService = require('../services/FaceScanVitalService');

class WellnessService {
    constructor() {
        // Updated ideal values based on current health guidelines
        this.idealData = {
            physical_activity: {
                male: {
                    "18-34": { steps_per_day: 10000, active_minutes_per_day: 150, calories_burned_per_day: 2500 },
                    "35-54": { steps_per_day: 8500, active_minutes_per_day: 150, calories_burned_per_day: 2200 },
                    "55+": { steps_per_day: 7000, active_minutes_per_day: 120, calories_burned_per_day: 1900 }
                },
                female: {
                    "18-34": { steps_per_day: 9500, active_minutes_per_day: 150, calories_burned_per_day: 2000 },
                    "35-54": { steps_per_day: 8000, active_minutes_per_day: 150, calories_burned_per_day: 1800 },
                    "55+": { steps_per_day: 6500, active_minutes_per_day: 120, calories_burned_per_day: 1600 }
                }
            },
            body_composition: {
                male: { 
                    "18-34": { min: 18.5, optimal: 22, max: 24.9 },
                    "35-54": { min: 18.5, optimal: 23, max: 24.9 },
                    "55+": { min: 18.5, optimal: 24, max: 26.9 }
                },
                female: { 
                    "18-34": { min: 18.5, optimal: 21, max: 24.9 },
                    "35-54": { min: 18.5, optimal: 22, max: 24.9 },
                    "55+": { min: 18.5, optimal: 23, max: 26.9 }
                }
            },
            sleep_quality: {
                male: { "18-34": { min: 7, optimal: 8, max: 9 }, "35-54": { min: 7, optimal: 8, max: 9 }, "55+": { min: 7, optimal: 8, max: 9 } },
                female: { "18-34": { min: 7, optimal: 8, max: 9 }, "35-54": { min: 7, optimal: 8, max: 9 }, "55+": { min: 7, optimal: 8, max: 9 } }
            },
            heart_health: {
                male: {
                    "18-34": { resting_heart_rate: { min: 50, optimal: 65, max: 85 }, hrv: { min: 30, optimal: 50, max: 70 } },
                    "35-54": { resting_heart_rate: { min: 50, optimal: 70, max: 90 }, hrv: { min: 25, optimal: 45, max: 65 } },
                    "55+": { resting_heart_rate: { min: 50, optimal: 75, max: 95 }, hrv: { min: 20, optimal: 40, max: 60 } }
                },
                female: {
                    "18-34": { resting_heart_rate: { min: 50, optimal: 70, max: 90 }, hrv: { min: 25, optimal: 45, max: 65 } },
                    "35-54": { resting_heart_rate: { min: 50, optimal: 75, max: 95 }, hrv: { min: 20, optimal: 40, max: 60 } },
                    "55+": { resting_heart_rate: { min: 50, optimal: 80, max: 100 }, hrv: { min: 15, optimal: 35, max: 55 } }
                }
            },
            diet_nutrition: {
                male: {
                    "18-34": { caloric_intake: 2500, protein: 56, fat: 78, carbs: 300, fibre: 38 },
                    "35-54": { caloric_intake: 2300, protein: 56, fat: 71, carbs: 275, fibre: 38 },
                    "55+": { caloric_intake: 2100, protein: 56, fat: 65, carbs: 250, fibre: 30 }
                },
                female: {
                    "18-34": { caloric_intake: 2000, protein: 46, fat: 65, carbs: 225, fibre: 25 },
                    "35-54": { caloric_intake: 1800, protein: 46, fat: 58, carbs: 200, fibre: 25 },
                    "55+": { caloric_intake: 1600, protein: 46, fat: 51, carbs: 180, fibre: 21 }
                }
            },
            exercise_metrics: {
                male: {
                    "18-34": { frequency: 5, intensity: 7, variety: 4 },
                    "35-54": { frequency: 4, intensity: 6, variety: 4 },
                    "55+": { frequency: 3, intensity: 5, variety: 3 }
                },
                female: {
                    "18-34": { frequency: 5, intensity: 7, variety: 4 },
                    "35-54": { frequency: 4, intensity: 6, variety: 4 },
                    "55+": { frequency: 3, intensity: 5, variety: 3 }
                }
            },
            face_scan: {
                oxygen: { min: 95, optimal: 98, max: 100 },
                systolic: { min: 90, optimal: 115, max: 130 },
                diastolic: { min: 60, optimal: 75, max: 85 },
                bpm: { min: 60, optimal: 70, max: 100 },
                rmssd: { min: 20, optimal: 40, max: 60 },
                sdnn: { min: 30, optimal: 50, max: 70 },
                pnn50: { min: 15, optimal: 30, max: 50 },
                map: { min: 70, optimal: 85, max: 100 },
                stress_score: { min: 0, max: 100 }
            }
        };

        // Updated weights with better distribution
        this.baseWeights = {
            physScore: 0.20,           // Physical activity
            bodyScore: 0.25,           // Body composition (BMI)
            sleepScore: 0.20,          // Sleep quality
            heartHealthScore: 0.15,    // Heart health
            dietNutritionScore: 0.10,  // Diet and nutrition
            exerciseMetricsScore: 0.05, // Exercise variety/intensity
            faceScanScore: 0.05        // Face scan vitals
        };

        // Critical metrics that heavily impact score if missing
        this.criticalMetrics = ['bodyScore', 'physScore', 'sleepScore'];
        
        // Minimum number of metrics required for a reliable wellness score
        this.minMetricsRequired = 3;
    }

    // Enhanced face scan scoring
    getFaceScanScore(faceScanData) {
        try {
            if (!faceScanData) return 0;

            const scores = [];
            const ideal = this.idealData.face_scan;

            // Oxygen saturation (critical metric)
            if (faceScanData.oxygen !== null && faceScanData.oxygen !== undefined) {
                const oxygenScore = this.calculateOptimalRangeScore(
                    faceScanData.oxygen,
                    ideal.oxygen.min,
                    ideal.oxygen.optimal,
                    ideal.oxygen.max
                );
                scores.push({ score: oxygenScore, weight: 0.3 });
            }

            // Blood pressure (combined systolic and diastolic)
            if (faceScanData.systolic && faceScanData.diastolic) {
                const systolicScore = this.calculateOptimalRangeScore(
                    faceScanData.systolic,
                    ideal.systolic.min,
                    ideal.systolic.optimal,
                    ideal.systolic.max
                );
                const diastolicScore = this.calculateOptimalRangeScore(
                    faceScanData.diastolic,
                    ideal.diastolic.min,
                    ideal.diastolic.optimal,
                    ideal.diastolic.max
                );
                scores.push({ score: (systolicScore + diastolicScore) / 2, weight: 0.25 });
            }

            // Heart Rate Variability metrics
            if (faceScanData.rmssd) {
                const rmssdScore = this.calculateOptimalRangeScore(
                    faceScanData.rmssd,
                    ideal.rmssd.min,
                    ideal.rmssd.optimal,
                    ideal.rmssd.max
                );
                scores.push({ score: rmssdScore, weight: 0.15 });
            }

            if (faceScanData.sdnn) {
                const sdnnScore = this.calculateOptimalRangeScore(
                    faceScanData.sdnn,
                    ideal.sdnn.min,
                    ideal.sdnn.optimal,
                    ideal.sdnn.max
                );
                scores.push({ score: sdnnScore, weight: 0.15 });
            }

            // Mean Arterial Pressure
            if (faceScanData.map) {
                const mapScore = this.calculateOptimalRangeScore(
                    faceScanData.map,
                    ideal.map.min,
                    ideal.map.optimal,
                    ideal.map.max
                );
                scores.push({ score: mapScore, weight: 0.15 });
            }

            if (scores.length === 0) return 0;

            const totalWeightedScore = scores.reduce((sum, item) => sum + (item.score * item.weight), 0);
            const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);

            return Number((totalWeightedScore / totalWeight).toFixed(2));

        } catch (error) {
            throw logError('getFaceScanScore', error, { faceScanData });
        }
    }

    // New method for optimal range scoring (min-optimal-max)
    calculateOptimalRangeScore(value, min, optimal, max) {
        if (value === null || value === undefined) return 0;
        
        if (value >= min && value <= max) {
            if (value === optimal) return 100;
            
            if (value < optimal) {
                // Linear scoring from min to optimal
                const range = optimal - min;
                const distance = optimal - value;
                return Math.max(60, 100 - (distance / range) * 40);
            } else {
                // Linear scoring from optimal to max
                const range = max - optimal;
                const distance = value - optimal;
                return Math.max(60, 100 - (distance / range) * 40);
            }
        } else if (value < min) {
            // Below minimum - steep penalty
            const penalty = ((min - value) / min) * 60;
            return Math.max(0, 60 - penalty);
        } else {
            // Above maximum - steep penalty
            const penalty = ((value - max) / max) * 60;
            return Math.max(0, 60 - penalty);
        }
    }

    // Enhanced BMI scoring with proper healthy range consideration
    getBodyCompositionScore(weight, height, gender, ageGroup) {
        try {
            if (weight === null || height === null) return 0;

            const heightInMeters = height > 3 ? height / 100 : height;
            const bmi = Number((weight / (heightInMeters * heightInMeters)).toFixed(2));
            const ideal = this.idealData.body_composition[gender][ageGroup];

            // Use the new optimal range scoring
            return this.calculateOptimalRangeScore(bmi, ideal.min, ideal.optimal, ideal.max);

        } catch (error) {
            throw logError('getBodyCompositionScore', error, { weight, height, gender, ageGroup });
        }
    }

    // Enhanced sleep scoring
    getSleepQualityScore(hoursOfSleep, gender, ageGroup) {
        try {
            if (hoursOfSleep === null || hoursOfSleep === undefined) return 0;
            
            const ideal = this.idealData.sleep_quality[gender][ageGroup];
            return this.calculateOptimalRangeScore(hoursOfSleep, ideal.min, ideal.optimal, ideal.max);
            
        } catch (error) {
            throw logError('getSleepQualityScore', error, { hoursOfSleep, gender, ageGroup });
        }
    }

    // Enhanced heart health scoring
    getHeartHealthScore(restingHeartRate, hrv, gender, ageGroup) {
        try {
            if (restingHeartRate === null && hrv === null) return 0;
            
            const ideal = this.idealData.heart_health[gender][ageGroup];
            const scores = [];

            if (restingHeartRate !== null && restingHeartRate > 0) {
                const rhrScore = this.calculateOptimalRangeScore(
                    restingHeartRate,
                    ideal.resting_heart_rate.min,
                    ideal.resting_heart_rate.optimal,
                    ideal.resting_heart_rate.max
                );
                scores.push({ score: rhrScore, weight: 0.7 });
            }

            if (hrv !== null && hrv > 0) {
                const hrvScore = this.calculateOptimalRangeScore(
                    hrv,
                    ideal.hrv.min,
                    ideal.hrv.optimal,
                    ideal.hrv.max
                );
                scores.push({ score: hrvScore, weight: 0.3 });
            }

            if (scores.length === 0) return 0;

            const totalWeightedScore = scores.reduce((sum, item) => sum + (item.score * item.weight), 0);
            const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);

            return Number((totalWeightedScore / totalWeight).toFixed(2));

        } catch (error) {
            throw logError('getHeartHealthScore', error, { restingHeartRate, hrv, gender, ageGroup });
        }
    }

    // Enhanced physical activity scoring
    getPhysicalActivityScore(steps, activeMinutes, caloriesBurned, gender, ageGroup) {
        try {
            if (steps === null && activeMinutes === null && caloriesBurned === null) return 0;
            
            const ideal = this.idealData.physical_activity[gender][ageGroup];
            const scores = [];

            if (steps !== null && steps >= 0) {
                const stepsScore = this.calculateScore(steps, ideal.steps_per_day);
                scores.push({ score: stepsScore, weight: 0.5 });
            }

            if (activeMinutes !== null && activeMinutes >= 0) {
                const activeMinutesScore = this.calculateScore(activeMinutes, ideal.active_minutes_per_day);
                scores.push({ score: activeMinutesScore, weight: 0.3 });
            }

            if (caloriesBurned !== null && caloriesBurned >= 0) {
                const caloriesScore = this.calculateScore(caloriesBurned, ideal.calories_burned_per_day);
                scores.push({ score: caloriesScore, weight: 0.2 });
            }

            if (scores.length === 0) return 0;

            const totalWeightedScore = scores.reduce((sum, item) => sum + (item.score * item.weight), 0);
            const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);

            return Number((totalWeightedScore / totalWeight).toFixed(2));

        } catch (error) {
            throw logError('getPhysicalActivityScore', error, { steps, activeMinutes, caloriesBurned, gender, ageGroup });
        }
    }

    // Enhanced diet nutrition scoring
    getDietNutritionScore(caloricIntake, macronutrientRatio, gender, ageGroup) {
        try {
            if (caloricIntake === null || !macronutrientRatio) return 0;
            
            const ideal = this.idealData.diet_nutrition[gender][ageGroup];
            const scores = [];

            // Caloric intake (most important)
            const caloricScore = this.calculateScore(caloricIntake, ideal.caloric_intake);
            scores.push({ score: caloricScore, weight: 0.4 });

            // Macronutrients
            if (macronutrientRatio.protein !== null) {
                const proteinScore = this.calculateScore(parseFloat(macronutrientRatio.protein), ideal.protein);
                scores.push({ score: proteinScore, weight: 0.25 });
            }

            if (macronutrientRatio.fat !== null) {
                const fatScore = this.calculateScore(parseFloat(macronutrientRatio.fat), ideal.fat);
                scores.push({ score: fatScore, weight: 0.15 });
            }

            if (macronutrientRatio.carbs !== null) {
                const carbsScore = this.calculateScore(parseFloat(macronutrientRatio.carbs), ideal.carbs);
                scores.push({ score: carbsScore, weight: 0.15 });
            }

            if (macronutrientRatio.fibre !== null) {
                const fibreScore = this.calculateScore(parseFloat(macronutrientRatio.fibre), ideal.fibre);
                scores.push({ score: fibreScore, weight: 0.05 });
            }

            if (scores.length === 0) return 0;

            const totalWeightedScore = scores.reduce((sum, item) => sum + (item.score * item.weight), 0);
            const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);

            return Number((totalWeightedScore / totalWeight).toFixed(2));

        } catch (error) {
            throw logError('getDietNutritionScore', error, { caloricIntake, macronutrientRatio, gender, ageGroup });
        }
    }

    // Enhanced exercise metrics scoring
    getExerciseMetricsScore(frequency, intensity, variety, gender, ageGroup) {
        try {
            if (frequency === null && intensity === null && variety === null) return 0;
            
            const ideal = this.idealData.exercise_metrics[gender][ageGroup];
            const scores = [];

            if (frequency !== null && frequency >= 0) {
                const frequencyScore = this.calculateScore(frequency, ideal.frequency);
                scores.push({ score: frequencyScore, weight: 0.5 });
            }

            if (intensity !== null && intensity >= 0) {
                const intensityScore = this.calculateScore(intensity, ideal.intensity);
                scores.push({ score: intensityScore, weight: 0.3 });
            }

            if (variety !== null && variety >= 0) {
                const varietyScore = this.calculateScore(variety, ideal.variety);
                scores.push({ score: varietyScore, weight: 0.2 });
            }

            if (scores.length === 0) return 0;

            const totalWeightedScore = scores.reduce((sum, item) => sum + (item.score * item.weight), 0);
            const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);

            return Number((totalWeightedScore / totalWeight).toFixed(2));

        } catch (error) {
            throw logError('getExerciseMetricsScore', error, { frequency, intensity, variety, gender, ageGroup });
        }
    }

    // Enhanced final score calculation with proper missing data handling
    calculateFinalScore(scores) {
        try {
            const availableScores = [];
            const missingCriticalMetrics = [];
            
            console.log("Calculating final score with scores:", scores);

            // Check which scores are available and identify missing critical metrics
            for (const [key, score] of Object.entries(scores)) {
                if (this.baseWeights[key] !== undefined) {
                    if (score !== null && score !== undefined && score > 0) {
                        availableScores.push({
                            key,
                            score,
                            weight: this.baseWeights[key],
                            isCritical: this.criticalMetrics.includes(key)
                        });
                    } else if (this.criticalMetrics.includes(key)) {
                        missingCriticalMetrics.push(key);
                    }
                }
            }

            // If we don't have minimum required metrics, return low score
            if (availableScores.length < this.minMetricsRequired) {
                console.log(`Insufficient metrics: ${availableScores.length}/${this.minMetricsRequired} required`);
                return Math.max(10, availableScores.length * 15); // Basic score based on available data
            }

            // Calculate penalty for missing critical metrics
            const criticalPenalty = missingCriticalMetrics.length * 15; // 15% penalty per missing critical metric
            
            // Calculate weighted average of available scores
            const totalWeightedScore = availableScores.reduce((sum, item) => sum + (item.score * item.weight), 0);
            const totalWeight = availableScores.reduce((sum, item) => sum + item.weight, 0);
            
            const baseScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
            
            // Apply critical metric penalty
            const finalScore = Math.max(0, baseScore - criticalPenalty);
            
            // Additional penalty if we're missing too many metrics overall
            const dataCompletenessPenalty = Math.max(0, (Object.keys(this.baseWeights).length - availableScores.length) * 5);
            
            const adjustedScore = Math.max(0, finalScore - dataCompletenessPenalty);
            
            console.log({
                availableMetrics: availableScores.length,
                missingCritical: missingCriticalMetrics.length,
                baseScore: baseScore.toFixed(2),
                criticalPenalty,
                dataCompletenessPenalty,
                finalScore: adjustedScore.toFixed(2)
            });

            return Number(adjustedScore.toFixed(2));

        } catch (error) {
            throw logError('calculateFinalScore', error, { scores });
        }
    }

    // Improved basic score calculation
    calculateScore(actual, ideal, isLowerBetter = false) {
        try {
            if (actual === null || actual === undefined) return 0;
            
            let score;
            if (isLowerBetter) {
                // For metrics where lower is better (like resting heart rate)
                if (actual <= ideal) {
                    score = 100;
                } else {
                    const excess = actual - ideal;
                    const penaltyRate = Math.min(excess / ideal, 1) * 50; // Max 50% penalty
                    score = Math.max(50, 100 - penaltyRate);
                }
            } else {
                // For metrics where higher is better or meeting target is ideal
                if (actual >= ideal) {
                    score = 100;
                } else {
                    const deficit = ideal - actual;
                    const penaltyRate = Math.min(deficit / ideal, 0.8) * 60; // Max 60% penalty
                    score = Math.max(40, 100 - penaltyRate);
                }
            }
            
            return Math.min(Math.max(score, 0), 100);
            
        } catch (error) {
            throw logError('calculateScore', error, { actual, ideal, isLowerBetter });
        }
    }

    // Rest of the methods remain the same but with updated scoring calls
    async calculateWellnessScore(params) {
        try {
            const {
                userId, age, gender, weight, height, steps, activeMinutes, caloriesBurned,
                hoursOfSleep, restingHeartRate, hrv,
                caloricIntake, macronutrientRatio, hydration,
                frequency, intensity, variety
            } = params;
            
            console.log(age, "...", gender, "....", weight, "....", height);
            
            if (!age || !gender) {
                return { wellnessScore: 0 };
            }

            const ageGroup = this.getAgeGroup(age);
            const previousScores = await scoringModel.findOne({ userId });

            // Get face scan data
            const faceScanData = await FaceScanVitalService.getLatestFaceScanVitalData(userId);
            
            const scores = {
                physScore: this.getPhysicalActivityScore(steps, activeMinutes, caloriesBurned, gender.toLowerCase(), ageGroup),
                bodyScore: this.getBodyCompositionScore(weight, height, gender.toLowerCase(), ageGroup),
                sleepScore: this.getSleepQualityScore(hoursOfSleep, gender.toLowerCase(), ageGroup),
                heartHealthScore: this.getHeartHealthScore(restingHeartRate, hrv, gender.toLowerCase(), ageGroup),
                dietNutritionScore: this.getDietNutritionScore(caloricIntake, macronutrientRatio, gender.toLowerCase(), ageGroup),
                exerciseMetricsScore: this.getExerciseMetricsScore(frequency, intensity, variety, gender.toLowerCase(), ageGroup),
                faceScanScore: this.getFaceScanScore(faceScanData),
                prevWellnessScore: previousScores?.wellnessScore || 0,
                prevPhysScore: previousScores?.physScore || 0,
                prevBodyScore: previousScores?.bodyScore || 0,
                prevSleepScore: previousScores?.sleepScore || 0,
                prevHeartHealthScore: previousScores?.heartHealthScore || 0,
                prevDietNutritionScore: previousScores?.dietNutritionScore || 0,
                prevExerciseMetricsScore: previousScores?.exerciseMetricsScore || 0,
                prevFaceScanScore: previousScores?.faceScanScore || 0
            };
            
            const wellnessScore = this.calculateFinalScore(scores);
            console.log("Wellness Score:", wellnessScore);
            
            return { wellnessScore, ...scores };
            
        } catch (error) {
            throw logError('calculateWellnessScore', error, { params });
        }
    }

    getAgeGroup(age) {
        try {
            return age <= 34 ? "18-34" : age <= 54 ? "35-54" : "55+";
        } catch (error) {
            throw logError('getAgeGroup', error, { age });
        }
    }

    calculateAge(birthDateString) {
        try {
            const [year, month, day] = birthDateString.split("-").map(Number);
            const birthDate = new Date(year, month - 1, day);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();

            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        } catch (error) {
            throw logError('calculateAge', error, { birthDateString });
        }
    }

    formatMealData(data) {
        try {
            const {
                totalCal = '0',
                totalProtiens = '0',
                totalCarbs = '0',
                totalFats = '0',
                totalFibre = '0',
                totalSodium = '0',
                totalIron = '0',
                totalCalcium = '0',
                totalVitaminA = '0',
                totalVitaminC = '0',
                totalVitaminB = '0',
                total_water = '0'
            } = data;

            return {
                totalCal,
                nutrition: {
                    protein: totalProtiens,
                    carbs: totalCarbs,
                    fat: totalFats,
                    fibre: totalFibre,
                    sodium: totalSodium,
                    iron: totalIron,
                    calcium: totalCalcium,
                    vitaminA: totalVitaminA,
                    vitaminC: totalVitaminC,
                    vitaminB: totalVitaminB,
                    water: total_water
                }
            };
        } catch (error) {
            throw logError('formatMealData', error, { data });
        }
    }

    formatDetailedScores(scores) {
        try {
            const scoreFields = [
                'wellnessScore', 'physScore', 'bodyScore', 'sleepScore',
                'heartHealthScore', 'dietNutritionScore', 'exerciseMetricsScore',
                'prevWellnessScore', 'prevPhysScore', 'prevBodyScore',
                'prevSleepScore', 'prevHeartHealthScore', 'prevDietNutritionScore',
                'prevExerciseMetricsScore', 'prevFaceScanScore', 'faceScanScore'
            ];

            const formattedScores = {};
            for (const field of scoreFields) {
                if (scores[field] !== undefined && scores[field] !== null) {
                    formattedScores[field] = scores[field];
                }
            }

            return Object.keys(formattedScores).length === 0
                ? { message: "No wellness data for the user." }
                : formattedScores;
        } catch (error) {
            throw logError('formatDetailedScores', error, { scores });
        }
    }

    async validateAndGetUserDetails(userId) {
        try {
            const userDetails = await userModel.findById(userId)
                .populate('profile')
                .lean()
                .exec();

            if (!userDetails) {
                throw new Error('User not found');
            }

            return userDetails;
        } catch (error) {
            throw logError('validateAndGetUserDetails', error, { userId });
        }
    }

    formatMacronutrients(mealData) {
        try {
            return {
                protein: parseFloat(mealData?.protein) || 0,
                fat: parseFloat(mealData?.fats) || 0,
                carbs: parseFloat(mealData?.carbohydrates) || 0,
                fibre: parseFloat(mealData?.fibre) || 0
            };
        } catch (error) {
            throw logError('formatMacronutrients', error, { mealData });
        }
    }

    async updateScores(userId, scores) {
        try {
            if (scores.wellnessScore === scores.prevWellnessScore) {
                return await scoringModel.findOne({ userId });
            }

            return await scoringModel.findOneAndUpdate(
                { userId },
                { userId, ...scores },
                { new: true, upsert: true }
            );
        } catch (error) {
            throw logError('updateScores', error, { userId, scores });
        }
    }

    async saveWellnessScore(userId) {
        try {
            const userDetails = await this.validateAndGetUserDetails(userId);
            if (!userDetails) {
                throw new Error('User not found');
            }

            const { profile } = userDetails;
            if (!profile.gender || !profile.dateOfBirth) {
                throw new Error('Required Missing Fields in User Profile: Gender or DateOfBirth');
            }

            const mealData = await MealService.getDailyMeals(userId, Date.now());
            if (!mealData) {
                throw new Error('Failed to fetch meal data');
            }

            const age = this.calculateAge(profile.dateOfBirth);
            const fitnessData = await FitnessDataService.getFitnessDataForCurrentDay(userId);
            
            console.log("fitnessData", fitnessData);
            
            const scores = await this.calculateWellnessScore({
                userId,
                age,
                gender: profile.gender,
                weight: profile.weight || null,
                height: profile.height || null,
                steps: fitnessData ? fitnessData.steps.totalSteps : null,
                activeMinutes: fitnessData ? fitnessData.steps.totalMoveMinutes : null,
                caloriesBurned: null,
                hoursOfSleep: fitnessData ? (fitnessData.sleep.totalSleepDuration / (1000 * 60 * 60)) : null,
                restingHeartRate: fitnessData ? fitnessData.heartRate.averageBpm : null,
                hrv: null,
                caloricIntake: mealData ? parseInt(mealData.dailyTotals.calories) || null : null,
                macronutrientRatio: mealData ? this.formatMacronutrients(mealData.dailyTotals) : null,
                hydration: fitnessData ? fitnessData.water.totalIntake : null,
                frequency: null,
                intensity: null,
                variety: null
            });
            
            const updatedScores = await this.updateScores(userId, scores);
            if (!updatedScores) {
                throw new Error('Failed to update wellness scores');
            }

            return updatedScores;

        } catch (error) {
            throw logError('saveWellnessScore', error, { userId });
        }
    }

    async getUserWellnessScore(userId) {
        try {
            const userExists = await this.validateUser(userId);
            if (!userExists) {
                throw new Error('User not found');
            }
            
            await this.saveWellnessScore(userId);

            const scores = await scoringModel.findOne({ userId });
            if (!scores) {
                return {
                    status: 'success',
                    message: 'No wellness data found for the user',
                    data: {
                        wellnessScore: 0,
                        prevWellnessScore: 0
                    }
                };
            }

            return {
                status: 'success',
                data: {
                    wellnessScore: scores.wellnessScore || 0,
                    prevWellnessScore: scores.prevWellnessScore || 0
                }
            };

        } catch (error) {
            throw logError('getUserWellnessScore', error, {
                userId,
                method: 'getUserWellnessScore',
                timestamp: new Date().toISOString()
            });
        }
    }

    async getDetailedWellnessScore(userId) {
        try {
            const userExists = await this.validateUser(userId);
            if (!userExists) {
                throw new Error('User not found');
            }

            const scores = await scoringModel.findOne({ userId });
            if (!scores) {
                return {
                    status: 'success',
                    message: 'No wellness data found for the user',
                    data: this.getEmptyScores()
                };
            }

            return {
                status: 'success',
                data: this.formatDetailedScores(scores)
            };

        } catch (error) {
            throw logError('getDetailedWellnessScore', error, {
                userId,
                method: 'getDetailedWellnessScore',
                timestamp: new Date().toISOString()
            });
        }
    }

    async validateUser(userId) {
        try {
            const user = await userModel.findById(userId);
            return !!user;
        } catch (error) {
            throw logError('validateUser', error, { userId });
        }
    }

    getEmptyScores() {
        return {
            wellnessScore: 0,
            physScore: 0,
            bodyScore: 0,
            sleepScore: 0,
            heartHealthScore: 0,
            dietNutritionScore: 0,
            exerciseMetricsScore: 0,
            faceScanScore: 0,
            prevWellnessScore: 0,
            prevPhysScore: 0,
            prevBodyScore: 0,
            prevSleepScore: 0,
            prevHeartHealthScore: 0,
            prevDietNutritionScore: 0,
            prevExerciseMetricsScore: 0,
            prevFaceScanScore: 0
        };
    }

    validateScores(scores) {
        return {
            isValid: true,
            normalizedScores: {
                ...scores,
                wellnessScore: Number((scores.wellnessScore || 0).toFixed(2)),
                prevWellnessScore: Number((scores.prevWellnessScore || 0).toFixed(2))
            }
        };
    }
}

module.exports = new WellnessService();