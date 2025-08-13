const _ = require('lodash');
const Long = require('mongodb').Long;
const ObjectId = require('mongodb').ObjectId;
const { logError } = require('../utils/logError');
const userModel = require('../models/userProfile');
const UserService = require('./UserService');
const metricsModel = require('../models/smartscaleUserData');
const smartscaleMetricsHelper = require('../utils/smartScaleMetricsHelper');
const StreakService = require('./StreakService');
class SmartscaleService {
    static async addManualWeightEntry(userId, userData) {
        try {
            const user_data = await smartscaleMetricsHelper.fnAddBodyComposition(userId, userData);
            const metrics = new metricsModel(user_data);

            if(metrics)
            {
                const updatedata = { profile: { weight: metrics.weight } };
                await UserService.updateUserProfile(userId, updatedata);
                await StreakService.syncWeightStreakData(userId, Date.now());
            }
            
            return await metrics.save();
        } catch (error) {
            throw logError('addManualWeightEntry', error, { userData });
        }
    }

    
    static async getSmartscalePage(userID){

        if(!userID){
            throw logError('getSmartscalePage', error, { userID });
        }

        try{
            const rawUnreveresedData = await metricsModel.find({userId:userID}).sort({createdAt: -1}).limit(5);
            
            const rawData = rawUnreveresedData.reverse();
            if(!(rawData.length > 0)){
                return null;
            }
            const dataJson = JSON.stringify(rawData, null, 2);
            const data = JSON.parse(dataJson);
            
            console.log("raw smartscale data", data);
            const unitMappings = {
                weight: "kg",
                bmi: "",
                body_fat: "%",
                fat_free_weight: "kg",
                subcutaneous_fat: "%",
                visceral_fat: "%",
                body_water: "%",
                skeletal_muscle: "%",
                muscle_mass: "kg",
                bone_mass: "kg",
                protein: "%",
                bmr: "kcal",
                metabolic_age: "years",
                right_arm_fat: "%",
                right_arm_fat_kg:"kg",
                right_arm_muscle_mass: "%",
                right_arm_muscle_mass_kg:"kg",
                left_arm_fat: "%",
                left_arm_fat_kg: "kg",
                left_arm_muscle_mass: "%",
                left_arm_muscle_mass_kg:"kg",
                right_leg_fat: "%",
                right_leg_fat_kg:"kg",
                right_leg_muscle_mass: "%",
                right_leg_muscle_mass_kg:"kg",
                left_leg_fat: "%",
                left_leg_fat_kg:"kg",
                left_leg_muscle_mass: "%",
                left_leg_muscle_mass_kg:"kg",
                trunk_fat: "%",
                trunk_fat_kg:"kg",
                trunk_muscle_mass: "%",
                trunk_muscle_mass_kg:"kg",
                health_score: "%",
                standard_weight:"kg"
            };
        
            const metrics = Object.keys(data[0]).filter(key => !["_id", "userId", "timestamp", "device_type", "device_id", "createdAt", "updatedAt", "__v"].includes(key));
            console.log("metrics", metrics);
            const graphData = metrics.map(metric => {
                const y_axis = data.map(entry => {
                    const value = entry[metric];
                    if (typeof value === 'number') {
                        return Math.round(value); // Round to the nearest integer
                    } else if (value !== null && value !== undefined) {
                        const parsedValue = Number(value); // Convert to number
                        if (!isNaN(parsedValue)) {
                            return Math.round(parsedValue); // Round to the nearest integer
                        } else {
                            return null; // Unable to convert to number
                        }
                    } else {
                        return null; // Value is null or undefined
                    }
                });
                const x_axis = data.map(entry => parseInt(entry.timestamp));
            
                return {
                    key: metric,
                    unit: unitMappings[metric] || "",
                    "y-axis": y_axis,
                    "x-axis": x_axis
                };
            });

            console.log("graphData",graphData);
            
            //// nudge
            const nudge = await smartscaleMetricsHelper.generateSmartScaleNudges(data[data.length - 1])
            console.log("nudge", nudge);
            //// categories
            var catData;
            if(data.length < 5){
                catData = data[data.length-1]
            }else{
                catData = data[4]
            }
            
            const categories = [
                { title: 'weight', keys: ['fat_free_weight', 'bmi', 'bone_mass', 'body_water'] },
                { title: 'fat', keys: ['visceral_fat', 'subcutaneous_fat', 'right_arm_fat_kg','left_leg_fat_kg','right_leg_fat_kg','left_arm_fat_kg','trunk_fat_kg', 'body_fat'] },
                { title: 'muscle', keys: ['trunk_muscle_mass_kg', 'skeletal_muscle','right_arm_muscle_mass_kg', 'left_arm_muscle_mass_kg', 'left_leg_muscle_mass_kg','right_leg_muscle_mass_kg', 'protein', 'muscle_mass'] },
                { title: 'efficiency', keys: ['bmr', 'metabolic_age'] }
                ];
                
            const widgetResult = categories.map(category => {
                const categoryData = category.keys.map(key => ({
                    valueHeading: key,
                    value: catData[key] !== null && catData[key] !== undefined ? Number(catData[key].toFixed(0)) : null,
                    unit: unitMappings[key] || "", 
                }));
            
                return {
                    title: category.title,
                    values: categoryData,
                };
            });
        
            const healthScore =await smartscaleMetricsHelper.calRiskScore('male',catData.body_fat,catData.bmi,catData.body_water,catData.weight,catData.bone_mass,168,catData.muscle_mass, null,null,null,null,null)
            console.log(healthScore, "healthscore");
            const newEfficiencyValue = {
                "valueHeading": "health_score",
                "value": healthScore.welnessScore !== null && healthScore.welnessScore ?  Number(healthScore.welnessScore.toFixed(0)) : null,
                "unit":"%"
            };
        
            const efficiencySection = widgetResult.find(section => section.title === "efficiency");
            efficiencySection.values.push(newEfficiencyValue);

            const newWeightValue = {
                "valueHeading": "standard_weight",
                "value": 75, //hard coded, create a function to calculate standard weight
                "unit":"kg"
            };
        
            const weightSection = widgetResult.find(section => section.title === "weight");

            
            weightSection.values.push(newWeightValue);
            
            for (const category of widgetResult) {
                for (const item of category.values) {
                if (item.unit === 'kg') {
                    item.valueHeading = item.valueHeading.replace('_kg', ''); // Remove '_kg' if it exists
                }
                }
            }
            return {
                graphData,
                nudge,
                widgetResult
            };

        }catch(err){
            throw logError('getSmartScale page', err, { userID });
        }

    }

    static async getSmartscaleReadings(userID) {
        if (!userID) {
            throw logError('getSmartscalePage', error, { userID });
        }
    
        try {
            // Create date for 30 days ago
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
            // Query data without timestamp filter first
            const rawUnreversedData = await metricsModel.find({ 
                userId: userID
            })
            .sort({ createdAt: -1 })
            .lean();
            
            const rawData = rawUnreversedData.reverse();
            if (!(rawData.length > 0)) {
                return {
                    data: {
                        results: [],
                        current: 0,
                        type: "Weight"
                    }
                };
            }
    
            // Filter data for last 30 days in memory
            const filteredData = rawData.filter(entry => {
                const entryDate = new Date(entry.createdAt);
                return entryDate >= thirtyDaysAgo;
            });
    
            // Group data by date
            const groupedByDate = filteredData.reduce((acc, entry) => {
                const date = new Date(entry.createdAt).toISOString().split('T')[0];
                
                if (!acc[date]) {
                    acc[date] = {
                        date,
                        readings: [],
                        totalReadings: 0
                    };
                }
    
                acc[date].readings.push({
                    timestamp: entry.createdAt,
                    value: Number(entry.weight ? entry.weight.toFixed(1) : 0)
                });
                acc[date].totalReadings = acc[date].readings.length;
    
                return acc;
            }, {});
    
            // Convert grouped data to array and sort by date
            const processedData = Object.values(groupedByDate).sort((a, b) => 
                new Date(a.date) - new Date(b.date)
            );
    
            // Get the most recent weight as current
            const currentWeight = filteredData.length > 0 ? filteredData[filteredData.length - 1].weight : 0;
    
            return {
                data: {
                    results: processedData,
                    current: Number(currentWeight ? currentWeight.toFixed(1) : 0),
                    type: "Weight"
                }
            };
    
        } catch (err) {
            throw logError('getSmartscale page', err, { userID });
        }
    }
    

    static async addBodyCompositionMetrics(requestData) {
        try {
            let device_type = parseInt(requestData.device_type) || 0;
            let metrics = {};
            let user_data;

            if (device_type === 0 || device_type === 2 || device_type === 5 || device_type === 8) {
                user_data = await smartscaleMetricsHelper.fnAddBodyComposition(requestData);
            } else if (device_type === 1 || device_type == 3 || device_type === 4) {
                user_data = await smartscaleMetricsHelper.fnAddSmartscaleProData(requestData);
            }

            metrics = new metricsModel(user_data);

            if(metrics)
            {
                const updatedata = { profile: { weight: metrics.weight } };
                await UserService.updateUserProfile(userId, updatedata);
            }
            return await metrics.save();
        } catch (error) {
            throw logError('addBodyCompositionMetrics', error, { requestData });
        }
    }

    static async addBodyCompositionMetricsByUuid(requestData) {
        try {
            const user = await userModel.findOne({email: requestData.uuid});
            if(!user) {
                throw new Error('User Not Found');
            }

            let device_type = parseInt(requestData.device_type) || 0;
            let metrics = {};
            let user_data;

            if (device_type === 0 || device_type === 2 || device_type === 5 || device_type === 8) {
                user_data = await smartscaleMetricsHelper.fnAddBodyCompositionByUuid(requestData, user);
            } else if (device_type === 1 || device_type == 3 || device_type === 4) {
                user_data = await smartscaleMetricsHelper.fnAddSmartscaleProDataByUuid(requestData, user);
            }

            metrics = new metricsModel(user_data);
            return await metrics.save();
        } catch (error) {
            throw logError('addBodyCompositionMetricsByUuid', error, { requestData });
        }
    }

    static async getBodyCompositionMetrics(userId, from) {
        try {
            if (!ObjectId.isValid(userId)) {
                throw new Error('invalid userId');
            }

            let user_data;
            if (from) {
                user_data = await metricsModel.find({ 
                    userId: userId, 
                    timestamp: { $gte: Long.fromNumber(from) } 
                }).sort({ createdAt: -1 });

                if (user_data.length === 0) {
                    throw new Error('enter correct timestamp');
                }
            } else {
                user_data = await metricsModel.find({ userId: userId }).sort({ createdAt: -1 });
                if (user_data.length === 0) {
                    throw new Error('user data not found');
                }
            }

            return {
                code: 1,
                message: 'user data',
                data: await smartscaleMetricsHelper.fnBodyComposition(user_data)
            };
        } catch (error) {
            throw logError('getBodyCompositionMetrics', error, { userId, from });
        }
    }

    static async deleteBodyCompositionMetrics(userId) {
        try {
            if (!ObjectId.isValid(userId)) {s
                throw new Error('invalid userId');
            }

            const bcm = await metricsModel.deleteOne({ userId: userId });
            if (bcm.n === 0) {
                throw new Error('user_data not found with this id');
            }
            if (bcm.deletedCount === 0) {
                throw new Error('unable to remove data');
            }

            return {
                code: 1,
                message: 'user_data removed successfully'
            };
        } catch (error) {
            throw logError('deleteBodyCompositionMetrics', error, { userId });
        }
    }

    static async getLastReadingParentChild(userId) {
        try {
            if (!ObjectId.isValid(userId)) {
                throw new Error('invalid userId');
            }

            const child_ids = await userModel.find({ parent_id: userId }, { _id: 1 });
            const ids = [...child_ids.map(e => e._id), userId];
            
            const user_data = [];
            for (const id of ids) {
                const user_last_readings = await this.getUserLastReading(id);
                if (user_last_readings.length > 0) {
                    user_data.push(user_last_readings[0]);
                }
            }

            if (user_data.length === 0) {
                throw new Error('data not exists with this id');
            }

            return user_data.map(this.formatUserReading);
        } catch (error) {
            throw logError('getLastReadingParentChild', error, { userId });
        }
    }

    static async getReadingById(readingId) {
        try {
            const reading = await metricsModel.findOne({ _id: readingId });
            if (!reading) {
                throw new Error('reading not found');
            }
            return {
                code: 1,
                message: 'user_data removed successfully'
            };
        } catch (error) {
            throw logError('deleteBodyCompositionMetrics', error, { userId });
        }
    }
    
    
    async getSmartscaleUserCount() {
        try {
            const users = await userModel.find({}, { __v: 0 });
            return users.length;
        } catch (error) {
            throw logError('getSmartscaleUserCount', error);
        }
    }

    async getSmartscaleUserDataCount() {
        try {
            return await metricsModel.aggregate.count({});
        } catch (error) {
            throw logError('getSmartscaleUserDataCount', error);
        }
    }
}

module.exports = SmartscaleService;