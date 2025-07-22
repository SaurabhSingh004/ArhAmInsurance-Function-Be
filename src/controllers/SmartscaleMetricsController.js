const smartscaleService = require('../services/SmartscaleService');
const { logError } = require('../utils/logError');

class SmartscaleController {

    addManualWeightEntry = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const metrics = await smartscaleService.addManualWeightEntry(userId, await request.json() || {});
            return {
                status: 200,
                jsonBody: {
                    code: 1,
                    message: 'user_data added successfully',
                    _id: metrics._id,
                    metrics: metrics
                }
            };
        } catch (error) {
            const err = logError('addManualWeightEntry', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    code: 0,
                    message: 'ERROR',
                    error: err.message
                }
            };
        }
    }

    getSmartscaleReadings = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 200,
                    jsonBody: {
                        code: 0,
                        message: 'ENTER USER ID'
                    }
                };
            }

            const data = await smartscaleService.getSmartscaleReadings(userId);
            
            if (!data) {
                return {
                    status: 200,
                    jsonBody: {
                        code: 0,
                        message: 'NO DATA FOUND',
                        data: {
                            results: [],
                            current: 0,
                            type: "Weight"
                        }
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    code: 1,
                    message: 'SUCCESS',
                    data
                }
            };
            
        } catch (error) {
            const err = logError('getSmartscaleReadings', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    code: 0,
                    message: 'ERROR',
                    err: err.message
                }
            };
        }
    }

    getSmartscalePage = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 200,
                    jsonBody: {
                        code: 0,
                        message: 'ENTER USER ID'
                    }
                };
            }

            const data = await smartscaleService.getSmartscalePage(userId);
            
            if (!data) {
                return {
                    status: 200,
                    jsonBody: {
                        code: 0,
                        message: 'NO DATA FOUND',
                        data: {
                            "graphData": [],
                            "nudge": [],
                            "widgetResult": [
                                {
                                    "title": "weight",
                                    "values": [
                                        {
                                            "valueHeading": "fat_free_weight",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "bmi",
                                        },
                                        {
                                            "valueHeading": "bone_mass",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "body_water",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "standard_weight",
                                            "value": -1,
                                        }
                                    ]
                                },
                                {
                                    "title": "fat",
                                    "values": [
                                        {
                                            "valueHeading": "visceral_fat",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "subcutaneous_fat",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "right_arm_fat",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "left_leg_fat",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "right_leg_fat",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "left_arm_fat",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "trunk_fat",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "body_fat",
                                            "value": -1,
                                        }
                                    ]
                                },
                                {
                                    "title": "muscle",
                                    "values": [
                                        {
                                            "valueHeading": "trunk_muscle_mass",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "skeletal_muscle",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "right_arm_muscle_mass",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "left_arm_muscle_mass",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "left_leg_muscle_mass",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "right_leg_muscle_mass",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "protein",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "muscle_mass",
                                            "value": -1,
                                        }
                                    ]
                                },
                                {
                                    "title": "efficiency",
                                    "values": [
                                        {
                                            "valueHeading": "bmr",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "metabolic_age",
                                            "value": -1,
                                        },
                                        {
                                            "valueHeading": "health_score",
                                            "value": -1,
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                };
            } else {
                return {
                    status: 200,
                    jsonBody: {
                        code: 1,
                        message: 'SUCCESS',
                        data
                    }
                };
            }
            
        } catch (error) {
            const err = logError('getSmartscalePage', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    code: 0,
                    message: 'ERROR',
                    err: err.message
                }
            };
        }
    }

    addBodyCompositionMetrics = async (request, context) => {
        try {
            const data = await smartscaleService.addBodyCompositionMetrics(await request.json() || {});
            
            if (data) {
                return {
                    status: 200,
                    jsonBody: {
                        code: 1,
                        message: 'user_data added successfully',
                        _id: data._id
                    }
                };
            } else {
                return {
                    status: 400,
                    jsonBody: {
                        code: 1,
                        message: 'Bad request'
                    }
                };
            }
        } catch (error) {
            const err = logError('addBodyCompositionMetrics', error, { });
            return {
                status: 500,
                jsonBody: {
                    code: 0,
                    message: 'ERROR',
                    error: err.message
                }
            };
        }
    }

    addBodyCompositionMetricsByUuid = async (request, context) => {
        try {
            const metrics = await smartscaleService.addBodyCompositionMetricsByUuid(await request.json() || {});
            
            return {
                status: 200,
                jsonBody: {
                    code: 1,
                    message: 'user_data added successfully',
                    _id: metrics._id
                }
            };
        } catch (error) {
            const err = logError('addBodyCompositionMetricsByUuid', error);
            return {
                status: 500,
                jsonBody: {
                    code: 0,
                    message: 'ERROR',
                    error: err.message
                }
            };
        }
    }

    getBodyCompositionMetrics = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { from } = request.query || {};
            const result = await smartscaleService.getBodyCompositionMetrics(userId, from);
            
            return {
                status: 200,
                jsonBody: result
            };
        } catch (error) {
            const err = logError('getBodyCompositionMetrics', error, { userId: context.user?._id, from: request.query?.from });
            return {
                status: 500,
                jsonBody: {
                    code: 0,
                    message: 'ERROR',
                    error: err.message
                }
            };
        }
    }

    deleteBodyCompositionMetrics = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const result = await smartscaleService.deleteBodyCompositionMetrics(userId);
            
            return {
                status: 200,
                jsonBody: result
            };
        } catch (error) {
            const err = logError('deleteBodyCompositionMetrics', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    code: 0,
                    message: 'ERROR',
                    error: err.message
                }
            };
        }
    }

    getLastReadingParentChild = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const data = await smartscaleService.getLastReadingParentChild(userId);
            
            return {
                status: 200,
                jsonBody: data
            };
        } catch (error) {
            const err = logError('getLastReadingParentChild', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    code: 0,
                    message: 'ERROR',
                    error: err.message
                }
            };
        }
    }

    getReadingById = async (request, context) => {
        try {
            const { _id } = request.params || {};
            const reading = await smartscaleService.getReadingById(_id);
            
            return {
                status: 200,
                jsonBody: reading
            };
        } catch (error) {
            const err = logError('getReadingById', error, { readingId: request.params?._id });
            return {
                status: 500,
                jsonBody: {
                    code: 0,
                    message: 'ERROR',
                    error: err.message
                }
            };
        }
    }

    getSmartscaleUserCount = async (request, context) => {
        try {
            const count = await smartscaleService.getSmartscaleUserCount();
            
            return {
                status: 200,
                jsonBody: {
                    status: true,
                    error_num: '',
                    message: 'Smartscale Users count',
                    result: count
                }
            };
        } catch (error) {
            const err = logError('getSmartscaleUserCount', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    status: false,
                    message: 'ERROR',
                    error: err.message
                }
            };
        }
    }

    getSmartscaleUserDataCount = async (request, context) => {
        try {
            const count = await smartscaleService.getSmartscaleUserDataCount();
            
            return {
                status: 200,
                jsonBody: {
                    status: true,
                    error_num: '',
                    message: 'Smartscale Users data count',
                    result: count
                }
            };
        } catch (error) {
            const err = logError('getSmartscaleUserDataCount', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    status: false,
                    message: 'ERROR',
                    error: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new SmartscaleController();