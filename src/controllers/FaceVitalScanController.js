const FaceScanVitalService = require('../services/FaceScanVitalService');
const { logError } = require('../utils/logError');

class FaceScanVitalController {

    addFaceScanVitalData = async (request, context) => {
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

            const result = await FaceScanVitalService.addFaceScanVitalData(await request.json() || {}, userId);
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Face scan vital data saved successfully'
                }
            };
        } catch (error) {
            const err = logError('addFaceScanVitalData', error, { userId: context.user?._id });
            
            if (err.message === 'User ID is required') {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'User ID is required'
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to save face scan vital data'
                }
            };
        }
    }

    getAllFaceScanVitalData = async (request, context) => {
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

            const result = await FaceScanVitalService.getAllFaceScanVitalData(userId);
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Face scan vital data retrieved successfully'
                }
            };
        } catch (error) {
            const err = logError('getAllFaceScanVitalData', error, { userId: context.user?._id });

            if (err.message === 'User ID is required') {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'User ID is required'
                    }
                };
            }

            if (err.message === 'No records found') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'No records found'
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch face scan vital data'
                }
            };
        }
    }

    getLatestFaceScanVitalData = async (request, context) => {
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

            // Assuming you have a method in your service to get the latest entry
            const result = await FaceScanVitalService.getLatestFaceScanVitalData(userId);

            // If no data found, return 404
            if (!result) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'No face scan vital data found'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Latest face scan vital data retrieved successfully'
                }
            };
        } catch (error) {
            const err = logError('getLatestFaceScanVitalData', error, { userId: context.user?._id });

            if (err.message === 'User ID is required') {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'User ID is required'
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch latest face scan vital data'
                }
            };
        }
    }

    getFaceScanVitalData = async (request, context) => {
        try {
            const { id } = request.params || {};

            if (!id) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Record ID is required'
                    }
                };
            }

            const result = await FaceScanVitalService.getFaceScanVitalDataById(id);
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Face scan vital data retrieved successfully'
                }
            };
        } catch (error) {
            const err = logError('getFaceScanVitalData', error, { 
                recordId: request.params?.id,
                userId: context.user?._id 
            });

            if (err.message === 'Record ID is required') {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Record ID is required'
                    }
                };
            }

            if (err.message === 'No record found') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'No record found'
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch face scan vital data'
                }
            };
        }
    }

    reduceVScanCount = async (request, context) => {
        try {
            const reqData = await request.json()
            const { email } = reqData || {};
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

            if (!email) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Email is required'
                    }
                };
            }

            const result = await FaceScanVitalService.addFaceScanVitalData(reqData, userId);
            // await fnReduceFacialCount(email);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'VScan count reduced successfully'
                }
            };
        } catch (error) {
            const err = logError('reduceVScanCount', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to reduce VScan count'
                }
            };
        }
    }

    getFaceScanVitalsByDate = async (request, context) => {
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

            const date = request.query?.date;
            
            if (!date) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Valid date parameter is required (YYYY-MM-DD)'
                    }
                };
            }

            const result = await FaceScanVitalService.getFaceScanVitalsByDate(userId, date);

            if (result.length === 0) {
                return {
                    status: 200,
                    jsonBody: {
                        success: true,
                        data: [],
                        message: 'No face scan vital data found for the specified date'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Face scan vital data retrieved successfully'
                }
            };

        } catch (error) {
            const err = logError('getFaceScanVitalsByDate', error, { 
                userId: context.user?._id,
                date: request.query?.date 
            });

            if (err.message === 'No records found for the specified date') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'No records found for the specified date'
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch face scan vital data'
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new FaceScanVitalController();