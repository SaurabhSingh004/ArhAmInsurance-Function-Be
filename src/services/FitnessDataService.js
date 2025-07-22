// services/fitness.service.js
const FitnessData = require('../models/FitnessData');
const moment = require('moment');
const mongoose= require('mongoose');
const BloodTestReport = require('../models/bloodTestReport');
const FaceScanVital = require('../models/faceScanVital');

class FitnessService {
    static getDateRange(range = '30d') {
        const now = moment();
        let startDate, endDate;

        switch (range) {
            case '1d':
                startDate = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
                endDate = now.clone().format('YYYY-MM-DD');
                break;
            case '7d':
                startDate = now.clone().subtract(7, 'days').format('YYYY-MM-DD');
                endDate = now.clone().format('YYYY-MM-DD');
                break;
            case '30d':
            default:
                startDate = now.clone().subtract(30, 'days').format('YYYY-MM-DD');
                endDate = now.clone().format('YYYY-MM-DD');
                break;
        }

        return {
            startDate: new Date(startDate),
            endDate: new Date(endDate)
        };
    }

    static async getSleepData(userId, range = '30d') {
        try {
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
    
            const result = await FitnessData.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(userId),
                        date: { $gte: startDate, $lte: endDate },
                        'sleep.sessions': { $exists: true }
                    }
                },
                {
                    $facet: {
                        'dailyData': [
                            {
                                $project: {
                                    date: {
                                        $dateToString: {
                                            format: "%Y-%m-%d",
                                            date: "$date",
                                            timezone: "Asia/Kolkata"
                                        }
                                    },
                                    sessions: {
                                        $map: {
                                            input: "$sleep.sessions",
                                            as: "session",
                                            in: {
                                                startTime: {
                                                    $dateToString: {
                                                        format: "%Y-%m-%dT%H:%M:%S.%LZ",
                                                        date: "$$session.startTime",
                                                        timezone: "Asia/Kolkata"
                                                    }
                                                },
                                                endTime: {
                                                    $dateToString: {
                                                        format: "%Y-%m-%dT%H:%M:%S.%LZ",
                                                        date: "$$session.endTime",
                                                        timezone: "Asia/Kolkata"
                                                    }
                                                },
                                                duration: "$$session.duration",
                                                durationHours: {
                                                    $divide: ["$$session.duration", 3600000]
                                                }
                                            }
                                        }
                                    },
                                    totalSleepHours: {
                                        $divide: ["$sleep.totalSleepDuration", 3600000]
                                    }
                                }
                            },
                            {
                                $sort: { date: -1 }
                            }
                        ],
                        'statistics': [
                            {
                                $group: {
                                    _id: null,
                                    averageSleepHours: {
                                        $avg: { $divide: ["$sleep.totalSleepDuration", 3600000] }
                                    },
                                    maxSleepHours: {
                                        $max: { $divide: ["$sleep.totalSleepDuration", 3600000] }
                                    },
                                    minSleepHours: {
                                        $min: { $divide: ["$sleep.totalSleepDuration", 3600000] }
                                    },
                                    totalSleepHours: {
                                        $sum: { $divide: ["$sleep.totalSleepDuration", 3600000] }
                                    },
                                    daysWithSleepData: { $sum: 1 }
                                }
                            }
                        ],
                        'bestSleepDay': [
                            {
                                $sort: { "sleep.totalSleepDuration": -1 }
                            },
                            {
                                $limit: 1
                            },
                            {
                                $project: {
                                    date: {
                                        $dateToString: {
                                            format: "%Y-%m-%d",
                                            date: "$date",
                                            timezone: "Asia/Kolkata"
                                        }
                                    },
                                    totalSleepHours: {
                                        $divide: ["$sleep.totalSleepDuration", 3600000]
                                    }
                                }
                            }
                        ]
                    }
                }
            ]);
    
            const [aggregateResult] = result;
            const sleepData = aggregateResult.dailyData;
            const statistics = aggregateResult.statistics[0];
            const bestSleepDay = aggregateResult.bestSleepDay[0];
    
            console.log('Sleep data found:', sleepData.length);
            
            return {
                dailyData: sleepData,
                statistics: {
                    averageSleepHours: Math.round(statistics?.averageSleepHours * 10) / 10 || 0,
                    maxSleepHours: Math.round(statistics?.maxSleepHours * 10) / 10 || 0,
                    minSleepHours: Math.round(statistics?.minSleepHours * 10) / 10 || 0,
                    totalSleepHours: Math.round(statistics?.totalSleepHours * 10) / 10 || 0,
                    daysWithSleepData: statistics?.daysWithSleepData || 0
                },
                bestSleepDay: bestSleepDay || null
            };
    
        } catch (error) {
            console.error('Error in getSleepData:', error);
            throw error;
        }
    }

    static async getStepsData(userId, range = '30d') {
        try {
            const simpleFind = await FitnessData.find({
                userId: userId
            }).lean();
            console.log('Total documents found:', simpleFind.length);
            console.log('Sample document:', simpleFind[0]);
            
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);  // End of current day
            
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);  // Start of the day 30 days ago
    
            // Format today's date in the same format as in the database results
            const todayDateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
            // Get steps data and maximum steps in one query
            const result = await FitnessData.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(userId),
                        date: { $gte: startDate, $lte: endDate },
                        'steps.totalSteps': { $exists: true }
                    }
                },
                {
                    $facet: {
                        // Regular steps data
                        'stepsData': [
                            {
                                $addFields: {
                                    localDate: {
                                        $dateToString: {
                                            date: '$date',
                                            format: '%Y-%m-%d',
                                            timezone: 'Asia/Kolkata'
                                        }
                                    }
                                }
                            },
                            {
                                $project: {
                                    localDate: 1,
                                    date: 1,
                                    totalSteps: '$steps.totalSteps',
                                    totalMoveMinutes: '$steps.totalMoveMinutes',
                                }
                            },
                            {
                                $sort: { date: 1 }
                            }
                        ],
                        // Maximum steps calculation
                        'maxStepsInfo': [
                            {
                                $sort: { 'steps.totalSteps': -1 }
                            },
                            {
                                $limit: 1
                            },
                            {
                                $project: {
                                    date: {
                                        $dateToString: {
                                            date: '$date',
                                            format: '%Y-%m-%d',
                                            timezone: 'Asia/Kolkata'
                                        }
                                    },
                                    totalSteps: '$steps.totalSteps',
                                    totalMoveMinutes: '$steps.totalMoveMinutes'
                                }
                            }
                        ],
                        // Statistics
                        'statistics': [
                            {
                                $group: {
                                    _id: null,
                                    averageSteps: { $avg: '$steps.totalSteps' },
                                    totalSteps: { $sum: '$steps.totalSteps' },
                                    totalDistance: { $sum: '$steps.totalDistance' },
                                    totalMoveMinutes: { $sum: '$steps.totalMoveMinutes' },
                                    daysCount: { $sum: 1 }
                                }
                            }
                        ]
                    }
                }
            ]);
    
            const [aggregateResult] = result;
            const stepsData = aggregateResult.stepsData;
            const maxStepsDay = aggregateResult.maxStepsInfo[0];
            const statistics = aggregateResult.statistics[0];
    
            console.log('Steps data found:', stepsData.length);
            
            // Check if today's data exists in the results
            const todayData = stepsData.find(day => day.localDate === todayDateStr);
            
            // If today's data doesn't exist, add an empty entry
            if (!todayData) {
                stepsData.push({
                    localDate: todayDateStr,
                    date: new Date(),
                    totalSteps: 0,
                    totalMoveMinutes: 0
                });
                
                // Re-sort to ensure the array remains in chronological order
                stepsData.sort((a, b) => new Date(a.date) - new Date(b.date));
            }
            
            return {
                dailyData: stepsData,
                maxStepsDay: maxStepsDay || null,
                statistics: {
                    averageSteps: Math.round(statistics?.averageSteps || 0),
                    totalSteps: statistics?.totalSteps || 0,
                    totalDistance: statistics?.totalDistance || 0,
                    totalMoveMinutes: statistics?.totalMoveMinutes || 0,
                    daysCount: statistics?.daysCount || 0
                },
                todayData: todayData || {
                    localDate: todayDateStr,
                    date: new Date(),
                    totalSteps: 0,
                    totalMoveMinutes: 0
                }
            };
    
        } catch (error) {
            console.error('Error in getStepsData:', error);
            throw error;
        }
    }

    static async getHeartRateData(userId, range = '30d') {
        try {
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
    
            const result = await FitnessData.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(userId),
                        date: { $gte: startDate, $lte: endDate },
                        'heartRate.readings': { 
                            $exists: true,
                            $ne: []  // Ensure readings array is not empty
                        }
                    }
                },
                {
                    $facet: {
                        'dailyData': [
                            {
                                $project: {
                                    date: {
                                        $dateToString: {
                                            format: "%Y-%m-%d",
                                            date: "$date",
                                            timezone: "Asia/Kolkata"
                                        }
                                    },
                                    readings: {
                                        $filter: {
                                            input: "$heartRate.readings",
                                            as: "reading",
                                            cond: { 
                                                $and: [
                                                    { $gt: ["$$reading.bpm", 0] },  // BPM greater than 0
                                                    { $lt: ["$$reading.bpm", 250] } // Maximum reasonable BPM
                                                ]
                                            }
                                        }
                                    },
                                    averageBpm: "$heartRate.averageBpm",
                                    maxBpm: { 
                                        $max: {
                                            $filter: {
                                                input: "$heartRate.readings.bpm",
                                                as: "bpm",
                                                cond: { 
                                                    $and: [
                                                        { $gt: ["$$bpm", 0] },
                                                        { $lt: ["$$bpm", 250] }
                                                    ]
                                                }
                                            }
                                        }
                                    },
                                    minBpm: { 
                                        $min: {
                                            $filter: {
                                                input: "$heartRate.readings.bpm",
                                                as: "bpm",
                                                cond: { 
                                                    $and: [
                                                        { $gt: ["$$bpm", 0] },
                                                        { $lt: ["$$bpm", 250] }
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                $sort: { date: -1 }
                            }
                        ],
                        'extremeValues': [
                            {
                                $project: {
                                    date: {
                                        $dateToString: {
                                            format: "%Y-%m-%d",
                                            date: "$date",
                                            timezone: "Asia/Kolkata"
                                        }
                                    },
                                    maxBpm: { 
                                        $max: {
                                            $filter: {
                                                input: "$heartRate.readings.bpm",
                                                as: "bpm",
                                                cond: { 
                                                    $and: [
                                                        { $gt: ["$$bpm", 0] },
                                                        { $lt: ["$$bpm", 250] }
                                                    ]
                                                }
                                            }
                                        }
                                    },
                                    minBpm: { 
                                        $min: {
                                            $filter: {
                                                input: "$heartRate.readings.bpm",
                                                as: "bpm",
                                                cond: { 
                                                    $and: [
                                                        { $gt: ["$$bpm", 0] },
                                                        { $lt: ["$$bpm", 250] }
                                                    ]
                                                }
                                            }
                                        }
                                    },
                                    averageBpm: "$heartRate.averageBpm"
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    highestBpm: { $max: "$maxBpm" },
                                    lowestBpm: { $min: "$minBpm" },
                                    highestAverage: { $max: "$averageBpm" },
                                    lowestAverage: { $min: "$averageBpm" },
                                    overallAverage: { $avg: "$averageBpm" }
                                }
                            }
                        ]
                    }
                }
            ]);
    
            const [aggregateResult] = result;
            const heartRateData = aggregateResult.dailyData;
            const statistics = aggregateResult.extremeValues[0];
    
            console.log('Heart rate data found:', heartRateData.length);
            
            return {
                dailyData: heartRateData,
                statistics: {
                    highestBpm: statistics?.highestBpm || null,
                    lowestBpm: statistics?.lowestBpm || null,
                    highestDailyAverage: Math.round(statistics?.highestAverage || 0),
                    lowestDailyAverage: Math.round(statistics?.lowestAverage || 0),
                    overallAverage: Math.round(statistics?.overallAverage || 0)
                }
            };
    
        } catch (error) {
            console.error('Error in getHeartRateData:', error);
            throw error;
        }
    }

    static async getWaterData(userId, range = '30d') {
        try {
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
    
            const result = await FitnessData.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(userId),
                        date: { $gte: startDate, $lte: endDate },
                        'water.entries': { 
                            $exists: true,
                            $ne: []  // Ensure entries array is not empty
                        }
                    }
                },
                {
                    $facet: {
                        'dailyData': [
                            {
                                $project: {
                                    date: {
                                        $dateToString: {
                                            format: "%Y-%m-%d",
                                            date: "$date",
                                            timezone: "Asia/Kolkata"
                                        }
                                    },
                                    entries: {
                                        $map: {
                                            input: "$water.entries",
                                            as: "entry",
                                            in: {
                                                timestamp: "$$entry.timestamp",
                                                amount: {
                                                    $divide: ["$$entry.amount", 1000] // Convert ml to L
                                                },
                                                type: "$$entry.type"
                                            }
                                        }
                                    },
                                    totalIntake: {
                                        $divide: ["$water.totalIntake", 1000] // Convert ml to L
                                    },
                                    targetIntake: {
                                        $divide: ["$water.targetIntake", 1000] // Convert ml to L
                                    }
                                }
                            },
                            {
                                $sort: { date: -1 }
                            }
                        ],
                        'statistics': [
                            {
                                $group: {
                                    _id: null,
                                    totalIntake: { 
                                        $sum: { 
                                            $divide: ["$water.totalIntake", 1000] 
                                        }
                                    },
                                    averageIntake: { 
                                        $avg: { 
                                            $divide: ["$water.totalIntake", 1000] 
                                        }
                                    },
                                    highestIntake: { 
                                        $max: { 
                                            $divide: ["$water.totalIntake", 1000] 
                                        }
                                    },
                                    lowestIntake: { 
                                        $min: { 
                                            $divide: ["$water.totalIntake", 1000] 
                                        }
                                    },
                                    daysCount: { $sum: 1 },
                                    averageTarget: { 
                                        $avg: { 
                                            $divide: ["$water.targetIntake", 1000] 
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            ]);
    
            const [aggregateResult] = result;
            const waterData = aggregateResult.dailyData;
            const statistics = aggregateResult.statistics[0] || {
                totalIntake: 0,
                averageIntake: 0,
                highestIntake: 0,
                lowestIntake: 0,
                daysCount: 0,
                averageTarget: 2 // Default 2L if no data
            };
    
            // Find the day with maximum intake
            const maxIntakeDay = waterData.reduce((max, current) => {
                return (current.totalIntake > (max?.totalIntake || 0)) ? current : max;
            }, null);
    
            console.log('Water data found:', waterData.length);
            
            return {
                dailyData: waterData,
                statistics: {
                    totalIntake: Number(statistics.totalIntake.toFixed(2)),
                    dailyAverage: Number(statistics.averageIntake.toFixed(2)),
                    highestIntake: Number(statistics.highestIntake.toFixed(2)),
                    lowestIntake: Number(statistics.lowestIntake.toFixed(2)),
                    recommendedDaily: Number(statistics.averageTarget.toFixed(2)),
                    daysTracked: statistics.daysCount
                },
                maxIntakeDay: maxIntakeDay ? {
                    date: maxIntakeDay.date,
                    intake: Number(maxIntakeDay.totalIntake.toFixed(2))
                } : null
            };
    
        } catch (error) {
            console.error('Error in getWaterData:', error);
            throw error;
        }
    }

    static async getTodayWaterLog(userId) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of the day
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999); // End of the day
    
            const result = await FitnessData.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(userId),
                        date: { $gte: today, $lte: endOfDay },
                        'water.entries': { 
                            $exists: true,
                            $ne: []  // Ensure entries array is not empty
                        }
                    }
                },
                {
                    $project: {
                        date: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$date",
                                timezone: "Asia/Kolkata"
                            }
                        },
                        entries: {
                            $map: {
                                input: "$water.entries",
                                as: "entry",
                                in: {
                                    timestamp: "$$entry.timestamp",
                                    amount: {
                                        $divide: ["$$entry.amount", 1000] // Convert ml to L
                                    },
                                    type: "$$entry.type"
                                }
                            }
                        },
                        totalIntake: {
                            $divide: ["$water.totalIntake", 1000] // Convert ml to L
                        },
                        targetIntake: {
                            $divide: ["$water.targetIntake", 1000] // Convert ml to L
                        }
                    }
                }
            ]);
    
            if (!result.length) {
                return {
                    message: "No water intake logged for today.",
                    date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
                    totalIntake: 0,
                    targetIntake: 2, // Default 2L target if no data
                    entries: []
                };
            }
    
            const todayWaterData = result[0];
    
            return {
                date: todayWaterData.date,
                totalIntake: Number(todayWaterData.totalIntake.toFixed(2)),
                targetIntake: Number(todayWaterData.targetIntake.toFixed(2)),
                entries: todayWaterData.entries
            };
    
        } catch (error) {
            console.error('Error in getTodayWaterLog:', error);
            throw error;
        }
    }
    
    static async getRespiratoryData(userId, range = '30d') {
        try {
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
    
            const result = await FitnessData.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(userId),
                        date: { $gte: startDate, $lte: endDate },
                        'respiratory.readings': { 
                            $exists: true,
                            $ne: []  // Ensure readings array is not empty
                        }
                    }
                },
                {
                    $facet: {
                        'dailyData': [
                            {
                                $project: {
                                    date: {
                                        $dateToString: {
                                            format: "%Y-%m-%d",
                                            date: "$date",
                                            timezone: "Asia/Kolkata"
                                        }
                                    },
                                    readings: {
                                        $filter: {
                                            input: "$respiratory.readings",
                                            as: "reading",
                                            cond: { 
                                                $and: [
                                                    { $gt: ["$$reading.rate", 0] },  // Rate greater than 0
                                                    { $lt: ["$$reading.rate", 60] }, // Maximum reasonable breathing rate
                                                    { $gte: ["$$reading.confidence", 0.7] } // Only high confidence readings
                                                ]
                                            }
                                        }
                                    },
                                    averageRate: "$respiratory.averageRate",
                                    maxRate: {
                                        $max: "$respiratory.readings.rate"
                                    },
                                    minRate: {
                                        $min: "$respiratory.readings.rate"
                                    },
                                    restingRate: "$respiratory.restingRate"
                                }
                            },
                            {
                                $sort: { date: -1 }
                            }
                        ],
                        'statistics': [
                            {
                                $group: {
                                    _id: null,
                                    highestRate: { 
                                        $max: {
                                            $max: "$respiratory.readings.rate"
                                        }
                                    },
                                    lowestRate: { 
                                        $min: {
                                            $min: "$respiratory.readings.rate"
                                        }
                                    },
                                    averageRate: { 
                                        $avg: "$respiratory.averageRate"
                                    },
                                    averageRestingRate: {
                                        $avg: "$respiratory.restingRate"
                                    },
                                    daysTracked: { $sum: 1 }
                                }
                            }
                        ]
                    }
                }
            ]);
    
            const [aggregateResult] = result;
            const respiratoryData = aggregateResult.dailyData;
            const statistics = aggregateResult.statistics[0] || {
                highestRate: 0,
                lowestRate: 0,
                averageRate: 0,
                averageRestingRate: 0,
                daysTracked: 0
            };
    
            // Find day with highest average respiratory rate
            const maxRateDay = respiratoryData.reduce((max, current) => {
                return (current.averageRate > (max?.averageRate || 0)) ? current : max;
            }, null);
    
            console.log('Respiratory data found:', respiratoryData.length);
            
            return {
                dailyData: respiratoryData.map(day => ({
                    ...day,
                    readings: day.readings.map(reading => ({
                        ...reading,
                        rate: Number(reading.rate.toFixed(1))
                    })),
                    averageRate: Number(day.averageRate.toFixed(1)),
                    maxRate: Number(day.maxRate.toFixed(1)),
                    minRate: Number(day.minRate.toFixed(1)),
                    restingRate: Number(day.restingRate.toFixed(1))
                })),
                statistics: {
                    highestRate: Number(statistics.highestRate.toFixed(1)),
                    lowestRate: Number(statistics.lowestRate.toFixed(1)),
                    averageRate: Number(statistics.averageRate.toFixed(1)),
                    restingRate: Number(statistics.averageRestingRate.toFixed(1)),
                    daysTracked: statistics.daysTracked
                },
                maxRateDay: maxRateDay ? {
                    date: maxRateDay.date,
                    rate: Number(maxRateDay.averageRate.toFixed(1))
                } : null
            };
    
        } catch (error) {
            console.error('Error in getRespiratoryData:', error);
            throw error;
        }
    }

    static async updateWaterEntry(userId, entryData, operation = 'add') {
        try {
            // Find today's fitness data document or create one
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            let fitnessData = await FitnessData.findOne({
                userId,
                date: {
                    $gte: today,
                    $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                }
            });
    
            // Handle remove operation when no document exists
            if (!fitnessData && operation === 'remove') {
                return {
                    success: false,
                    message: 'No water entries found for today',
                    totalIntake: 0,
                    targetIntake: 2000,
                    remainingIntake: 2000,
                    entries: []
                };
            }
    
            // Create new document if doesn't exist (for add operation)
            if (!fitnessData) {
                fitnessData = new FitnessData({
                    userId,
                    date: today,
                    syncSource: 'MANUAL',
                    water: {
                        entries: [],
                        totalIntake: 0,
                        targetIntake: 2000
                    }
                });
            }
    
            // Initialize water object if it doesn't exist
            if (!fitnessData.water) {
                fitnessData.water = {
                    entries: [],
                    totalIntake: 0,
                    targetIntake: 2000
                };
            }
    
            if (operation === 'add') {
                // Create and add new entry
                const newEntry = {
                    timestamp: new Date(),
                    amount: entryData.amount,
                    type: 'WATER'
                };
    
                fitnessData.water.entries.push(newEntry);
                fitnessData.water.totalIntake += newEntry.amount;
    
            } else if (operation === 'remove') {
                // Check if there are any entries to remove
                if (!fitnessData.water.entries || fitnessData.water.entries.length === 0) {
                    return {
                        success: false,
                        message: 'No water entries to remove',
                        totalIntake: 0,
                        targetIntake: fitnessData.water.targetIntake || 2000,
                        remainingIntake: fitnessData.water.targetIntake || 2000,
                        entries: []
                    };
                }
    
                // Remove the latest entry
                const removedEntry = fitnessData.water.entries.pop();
                fitnessData.water.totalIntake = Math.max(0, fitnessData.water.totalIntake - removedEntry.amount);
            }
    
            // Update metadata
            fitnessData.metadata = {
                lastSyncTime: new Date(),
                syncStatus: 'SUCCESS',
                syncDetails: {
                    dataTypes: ['WATER'],
                    processedAt: new Date()
                }
            };
    
            // Save the document
            await fitnessData.save();
    
            return {
                success: true,
                message: operation === 'add' ? 'Water entry added successfully' : 'Latest water entry removed successfully',
                totalIntake: fitnessData.water.totalIntake,
                targetIntake: fitnessData.water.targetIntake,
                remainingIntake: Math.max(0, fitnessData.water.targetIntake - fitnessData.water.totalIntake),
                entries: fitnessData.water.entries
            };
    
        } catch (error) {
            console.error('Error in updateWaterEntry:', error);
            return {
                success: false,
                message: `Failed to ${operation} water entry: ${error.message}`,
                totalIntake: 0,
                targetIntake: 2000,
                remainingIntake: 2000,
                entries: []
            };
        }
    }

    static async getRecentReports(userId) {
        try {
            // Get latest blood test report
            const latestBloodTest = await BloodTestReport.findOne(
                { userId: userId },
                { 
                    title: 1, 
                    createdAt: 1,
                    metrics: 1
                }
            ).sort({ createdAt: -1 });

            // Get latest face scan vital
            const latestFaceScan = await FaceScanVital.findOne(
                { userId: userId },
                {
                    createdAt: 1,
                    bpm: 1,
                    oxygen: 1,
                    systolic: 1,
                    diastolic: 1,
                    stressStatus: 1
                }
            ).sort({ createdAt: -1 });

            const recentData = await FitnessData.findOne(
                {
                    userId: new mongoose.Types.ObjectId(userId),
                    'heartRate.readings': { $exists: true, $ne: [] }
                },
                {
                    date: 1,
                    'heartRate.readings': 1,
                    'heartRate.averageBpm': 1,
                    metadata: 1
                }
            ).sort({ date: -1 });

            const currentReadings = recentData?.heartRate.readings;
            let latestReading = null;

            if(currentReadings)
            {
                latestReading = currentReadings
                .sort((a, b) => b.timestamp - a.timestamp)[0];
            }

            return {
                bloodTest: latestBloodTest ? {
                    title: latestBloodTest.title,
                    date: latestBloodTest.createdAt,
                } : null,
                faceScan: latestFaceScan ? {
                    date: latestFaceScan.createdAt,
                    title: "Face Scan Analysis",
                    summary: {
                        heartRate: latestFaceScan.bpm,
                        oxygenSaturation: latestFaceScan.oxygen,
                        bloodPressure: {
                            systolic: latestFaceScan.systolic,
                            diastolic: latestFaceScan.diastolic
                        },
                        stressLevel: latestFaceScan.stressStatus
                    }
                } : null,
                heartrate: latestReading
            };
        } catch (error) {
            console.error('Error in getLatestReadings:', error);
            throw new Error('Failed to fetch latest readings');
        }
    }

    static async addHeartRateData(userId, heartRateData) {
        try {
            // Find today's fitness data document or create one
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            let fitnessData = await FitnessData.findOne({
                userId,
                date: {
                    $gte: today,
                    $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                }
            });
            console.log(fitnessData);
            if (!fitnessData) {
                fitnessData = new FitnessData({
                    userId,
                    date: today,
                    syncSource: 'MANUAL',
                    heartRate: {
                        readings: [],
                        averageBpm: 0
                    }
                });
            }

            // Add the new reading
            const newReading = {
                timestamp: Date.now(),
                bpm: heartRateData
            };
            console.log("newReading", newReading);

            // Initialize heartRate if it doesn't exist
            if (!fitnessData.heartRate) {
                fitnessData.heartRate = {
                    readings: [],
                    averageBpm: 0
                };
            }

            // Add the reading
            fitnessData.heartRate.readings.push(newReading);

            // Calculate new average
            const totalBpm = fitnessData.heartRate.readings.reduce((sum, reading) => sum + reading.bpm, 0);
            fitnessData.heartRate.averageBpm = totalBpm / fitnessData.heartRate.readings.length;

            // Update metadata
            fitnessData.metadata = {
                ...fitnessData.metadata,
                lastSyncTime: new Date(),
                syncStatus: 'SUCCESS',
                syncDetails: {
                    dataTypes: ['HEART_RATE'],
                    processedAt: new Date()
                }
            };

            // Save the document
            await fitnessData.save();

            return {
                success: true,
                data: {
                    reading: newReading,
                    averageBpm: fitnessData.heartRate.averageBpm,
                    totalReadings: fitnessData.heartRate.readings.length
                }
            };

        } catch (error) {
            console.error('Error in addHeartRateData:', error);
            throw new Error('Failed to add heart rate data');
        }
    }

    static async getFitnessDataForCurrentDay(userId){
        try {
            // Get today's start and end timestamps
            const today = new Date();
            const startOfDay = new Date(today.setUTCHours(18, 30, 0, 0)); 
            const endOfDay = new Date(today.setUTCHours(47, 29, 59, 999)); 
            console.log("getFitnessDataForCurrentDay",startOfDay, endOfDay);
            const fitnessData = await FitnessData.findOne(
                {
                    userId: userId,
                    date: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    }
                },
                {
                    // Steps data
                    'steps.totalSteps': 1,
                    'steps.stepsByHour': 1,
                    'steps.totalDistance': 1,
                    'steps.totalMoveMinutes': 1,
                    'steps.averageStepLength': 1,
    
                    // Water data
                    'water.entries': 1,
                    'water.totalIntake': 1,
                    'water.targetIntake': 1,
    
                    // Heart rate data
                    'heartRate.readings': 1,
                    'heartRate.averageBpm': 1,
    
                    // Sleep data
                    'sleep.sessions': 1,
                    'sleep.totalSleepDuration': 1,
    
                    // Vitals data
                    'vitals.bloodPressure': 1,
                    'vitals.bodyTemperature': 1,
                    'vitals.oxygenSaturation': 1,
                    'vitals.respiratoryRate': 1,
    
                    // Respiratory data
                    'respiratory.readings': 1,
                    'respiratory.averageRate': 1,
                    'respiratory.maxRate': 1,
                    'respiratory.minRate': 1,
                    'respiratory.restingRate': 1,
    
                    // General fields
                    'date': 1,
                    'syncSource': 1,
                    'isActive': 1,
                    'metadata': 1
                }
            ).lean();
    
            // If no data exists for today, return structured empty data
            if (!fitnessData) {
                return {
                    date: new Date(),
                    steps: {
                        totalSteps: 0,
                        stepsByHour: [],
                        totalDistance: 0,
                        totalMoveMinutes: 0,
                        averageStepLength: 0
                    },
                    water: {
                        entries: [],
                        totalIntake: 0,
                        targetIntake: 2000 // Default target
                    },
                    heartRate: {
                        readings: [],
                        averageBpm: 0
                    },
                    sleep: {
                        sessions: [],
                        totalSleepDuration: 0
                    },
                    vitals: {
                        bloodPressure: {
                            systolic: 0,
                            diastolic: 0
                        },
                        bodyTemperature: 0,
                        oxygenSaturation: 0,
                        respiratoryRate: 0
                    },
                    respiratory: {
                        readings: [],
                        averageRate: 0,
                        maxRate: 0,
                        minRate: 0,
                        restingRate: 0
                    },
                    syncSource: 'MANUAL',
                    isActive: true,
                    metadata: {
                        lastSyncTime: new Date(),
                        syncStatus: 'SUCCESS',
                        syncDetails: {
                            dataTypes: [],
                            processedAt: new Date(),
                            rawResponseSize: 0
                        }
                    }
                };
            }
    
            // Return the found data with proper structure
            return {
                date: fitnessData.date,
                steps: {
                    totalSteps: fitnessData.steps?.totalSteps || 0,
                    stepsByHour: fitnessData.steps?.stepsByHour || [],
                    totalDistance: fitnessData.steps?.totalDistance || 0,
                    totalMoveMinutes: fitnessData.steps?.totalMoveMinutes || 0,
                    averageStepLength: fitnessData.steps?.averageStepLength || 0
                },
                water: {
                    entries: fitnessData.water?.entries || [],
                    totalIntake: fitnessData.water?.totalIntake || 0,
                    targetIntake: fitnessData.water?.targetIntake || 2000
                },
                heartRate: {
                    readings: fitnessData.heartRate?.readings || [],
                    averageBpm: fitnessData.heartRate?.averageBpm || 0
                },
                sleep: {
                    sessions: fitnessData.sleep?.sessions || [],
                    totalSleepDuration: fitnessData.sleep?.totalSleepDuration || 0
                },
                vitals: {
                    bloodPressure: {
                        systolic: fitnessData.vitals?.bloodPressure?.systolic || 0,
                        diastolic: fitnessData.vitals?.bloodPressure?.diastolic || 0
                    },
                    bodyTemperature: fitnessData.vitals?.bodyTemperature || 0,
                    oxygenSaturation: fitnessData.vitals?.oxygenSaturation || 0,
                    respiratoryRate: fitnessData.vitals?.respiratoryRate || 0
                },
                respiratory: {
                    readings: fitnessData.respiratory?.readings || [],
                    averageRate: fitnessData.respiratory?.averageRate || 0,
                    maxRate: fitnessData.respiratory?.maxRate || 0,
                    minRate: fitnessData.respiratory?.minRate || 0,
                    restingRate: fitnessData.respiratory?.restingRate || 0
                },
                syncSource: fitnessData.syncSource,
                isActive: fitnessData.isActive,
                metadata: fitnessData.metadata || {
                    lastSyncTime: new Date(),
                    syncStatus: 'SUCCESS',
                    syncDetails: {
                        dataTypes: [],
                        processedAt: new Date(),
                        rawResponseSize: 0
                    }
                }
            };
    
        } catch (error) {
            console.error('Error fetching current day fitness data:', error);
            throw error;
        }
    };
}

module.exports = FitnessService;
