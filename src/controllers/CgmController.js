const cgmModel = require('../models/cgmDevice');
const userModel = require('../models/userProfile');
const CgmService = require('../services/CgmService');
const cgmService = require('../services/CgmService');
const { logError } = require('../utils/logError');

// Statistics utility functions
const stats = {
    sum: (arr) => arr.reduce((a, b) => a + Number(b), 0),

    mean: (arr) => {
        const numArr = arr.map(Number);
        return numArr.reduce((a, b) => a + b, 0) / numArr.length;
    },

    stdev: (arr) => {
        const numArr = arr.map(Number);
        const mean = stats.mean(numArr);
        const variance = numArr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numArr.length;
        return Math.sqrt(variance);
    }
};

class CgmController {

    getDateRangeGlucoseReadings = async (request, context) => {
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

            let { startDate, endDate } = request.query || {};

            if (!startDate || !endDate) {
                const today = new Date();
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);

                // Format dates as YYYY-MM-DD
                const formatDate = (date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                startDate = startDate || formatDate(lastMonth);
                endDate = endDate || formatDate(today);
            }

            if (!startDate || !endDate) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Both startDate and endDate are required'
                    }
                };
            }

            const { results, latestReadings, totalReadings, dateRange, glucoseStats } =
                await CgmService.getDateRangeGlucoseReadings(userId, startDate, endDate);
            const latestReadingData = await cgmService.getLatestCgmReadingData(userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    totalDays: results.length,
                    totalReadings: totalReadings,
                    latestReadingData: latestReadingData,
                    dateRange: dateRange,
                    glucoseStats: glucoseStats,
                    data: {
                        results: results,
                        latestReadings: latestReadings
                    }
                }
            };

        } catch (error) {
            context.error('Error in getDateRangeGlucoseReadings:', error);
            const err = logError('getDateRangeGlucoseReadings', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error retrieving glucose readings',
                    error: err.message
                }
            };
        }
    }

    fnCgmDetails = async (request, context) => {
        try {
            const { date } = request.query || {};
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

            // Get CGM data
            const cgmData = await cgmService.getCgmData(userId, date);

            // If getCgmData returned a response (error or empty data), return early
            if (!cgmData || cgmData.statusCode) {
                return {
                    status: cgmData?.statusCode || 400,
                    jsonBody: {
                        success: false,
                        message: cgmData?.message || 'Failed to get CGM data'
                    }
                };
            }

            // Save calculations
            const calculated = await cgmService.saveCgmCalculations(
                cgmData,
                request.query?.userId,
                request.query?.date
            );

            context.log(200 + " CGM Data " + JSON.stringify(calculated));
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: "CGM Data retrieved successfully",
                    data: calculated
                }
            };

        } catch (error) {
            context.log("CGM Data Error: " + error.message);
            const err = logError('fnCgmDetails', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    // Upload sensorData Not Tested
    fnUploadSensorData = async (request, context) => {
        try {
            const reqData = await request.json();
            const { sensor_id, activationTime, sensorData } = reqData || {};

            let userId = reqData?.userId;

            if (!userId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: "Please Enter User ID"
                    }
                };
            }

            if (!sensor_id) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: "Please Enter SENSOR ID"
                    }
                };
            }

            if (!sensorData) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: "Please Enter SENSOR DATA"
                    }
                };
            }

            function clean(element) {
                for (key in element) {
                    // for every key in the current object
                    if (element[key] === 0) {
                        // if it's valued to '0'
                        delete element[key]; // remove it from the object
                    }
                }
            }

            clean(sensorData);

            if (!(typeof sensorData === "object" || sensorData instanceof Object)) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: "SENSOR DATA IS NOT IN OBJECT FORMAT"
                    }
                };
            }

            var cgmData = await cgmModel.findOne({ userId: userId });

            if (cgmData) {
                const oldGraph = cgmData.sensorData;
                const oldKeys = Object.keys(oldGraph);
                var oldKeysNum = [];

                oldKeys.forEach((element) => {
                    oldKeysNum.push(Number(element));
                });

                var maxKey = Math.max.apply(Math, oldKeysNum);
                context.log(sensorData);
                const newGraph = sensorData;

                for (key in newGraph) {
                    // for every key in the current object
                    if (Number(key) < maxKey + 60000) {
                        // if it's valued to '0'
                        delete newGraph[key]; // remove it from the object
                    }
                }

                const sensor_data = Object.assign(oldGraph, newGraph);

                const data = await cgmModel.findOneAndUpdate(
                    { userId: userId },
                    {
                        sensor_id: sensor_id,
                        activationTime: activationTime,
                        sensorData: sensor_data,
                    },
                    { new: true }
                );

                return {
                    status: 200,
                    jsonBody: {
                        success: true,
                        message: "UPDATED",
                        data: cgmData
                    }
                };
            } else {
                const data = await new cgmModel({
                    userId: userId,
                    sensor_id: sensor_id,
                    activationTime: activationTime,
                    sensorData: sensorData,
                });

                data.save();

                return {
                    status: 200,
                    jsonBody: {
                        success: true,
                        message: "CREATED",
                        data: data
                    }
                };
            }
        } catch (err) {
            context.log(err);
            const error = logError('fnUploadSensorData', err, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: "Server ERROR",
                    error: error.message
                }
            };
        }
    }

    //Get Latest Metabolic Score
    fnGetMetabolicScore = async (request, context) => {
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

            // Validate user ID
            if (!userId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: "Invalid or missing userId"
                    }
                };
            }

            // Call service method
            const scoreData = await cgmService.getUserMetabolicScore(userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: scoreData
                }
            };

        } catch (error) {
            context.error('Metabolic Score Controller Error:', error);
            const err = logError('fnGetMetabolicScore', error, { userId: context.user?._id });

            // Handle specific error types
            if (err.name === 'NotFoundError') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        error: err.message
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    error: "Internal server error"
                }
            };
        }
    }

    // Manual log glucose
    fnCGMData = async (request, context) => {
        try {
            const reqData = await request.json();
            const glucoseReading = reqData?.glucoseReading;
            const userId = context.user?._id;
            const reading_time = reqData?.reading_time;

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            if (!reading_time) {
                return {
                    status: 400,
                    jsonBody: {
                        code: 0,
                        message: "Please Enter reading time",
                    }
                };
            }

            const user = await userModel.findById(userId);

            if (!user) {
                return {
                    status: 400,
                    jsonBody: {
                        code: 0,
                        message: "No User Found..",
                    }
                };
            }

            // Call service method
            const result = await cgmService.processCGMData(
                userId,
                glucoseReading,
                reading_time,
                user
            );

            return {
                status: 200,
                jsonBody: {
                    code: 1,
                    message: "Blood Glucose reading has been successfully recorded.",
                    userId: userId,
                    data: result,
                }
            };

        } catch (err) {
            context.log(err);
            const error = logError('fnCGMData', err, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: error.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new CgmController();
