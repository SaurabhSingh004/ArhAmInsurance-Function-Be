const FaceScanVitalService = require('../services/FaceScanVitalService');
const { logError } = require('../utils/logError');

class FaceScanVitalController {

    addFaceScanVitalData = async (request, context) => {
        try {
            
            const requestData = await request.json() || {};
            
            // Basic validation for required fields
            if (!requestData.heart_rate && !requestData.bpm) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Heart rate is required'
                    }
                };
            }

            const result = await FaceScanVitalService.addFaceScanVitalData(requestData);
            
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

            const result = await FaceScanVitalService.getLatestFaceScanVitalData(userId);   

            // Remove health risk summary additions for clean response
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

    // Add these methods to your FaceScanVitalController class
    getFaceScans = async (request, context) => {
        try {
            const userId = request.query.userId;
            
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const result = await FaceScanVitalService.getFaceScans(userId);

            if(result.length === 0) {
                return {
                    status: 200,
                    jsonBody: {
                        success: false,
                        message: 'No face scan records found'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Face scans retrieved successfully',
                    count: result.length
                }
            };
        } catch (error) {
            const err = logError('getFaceScans', error, { userId: request.params.userId });

            if (err.message === 'No face scan records found') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'No face scan records found'
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch face scans'
                }
            };
        }
    }

    getFaceScanVitals = async (request, context) => {
        try {
            const logId = request.query.logId;
            
            // Optional query parameters
            const limit = parseInt(request.query?.limit) || 10;
            const page = parseInt(request.query?.page) || 1;
            const startDate = request.query?.startDate;
            const endDate = request.query?.endDate;

            if (limit < 1 || limit > 100) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Limit must be between 1 and 100'
                    }
                };
            }

            const result = await FaceScanVitalService.getFaceScanVitals(logId, {
                limit,
                page,
                startDate,
                endDate
            });
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result.data,
                    pagination: result.pagination,
                    summary: result.summary,
                    message: 'Face scan vitals retrieved successfully'
                }
            };
        } catch (error) {
            const err = logError('getFaceScanVitals', error, { 
                userId: request.params.logId,
                query: request.query 
            });

            if (err.message === 'No face scan vital records found') {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'No face scan vital records found'
                    }
                };
            }

            if (err.message.includes('Invalid date')) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: err.message
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch face scan vitals'
                }
            };
        }
    }

    // New endpoint for getting vital trends/analytics
    getVitalTrends = async (request, context) => {
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

            const days = parseInt(request.query?.days) || 30;
            
            if (days < 1 || days > 365) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Days parameter must be between 1 and 365'
                    }
                };
            }

            const result = await FaceScanVitalService.getVitalTrends(userId, days);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: `Vital trends for the last ${days} days retrieved successfully`
                }
            };

        } catch (error) {
            const err = logError('getVitalTrends', error, { 
                userId: context.user?._id,
                days: request.query?.days 
            });

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch vital trends'
                }
            };
        }
    }

    // New endpoint for health risk summary
    getHealthRiskSummary = async (request, context) => {
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

            const latestData = await FaceScanVitalService.getLatestFaceScanVitalData(userId);

            if (!latestData) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'No face scan data found'
                    }
                };
            }

            const riskSummary = FaceScanVitalService.getHealthRiskSummary(latestData);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: riskSummary,
                    message: 'Health risk summary retrieved successfully'
                }
            };

        } catch (error) {
            const err = logError('getHealthRiskSummary', error, { userId: context.user?._id });

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch health risk summary'
                }
            };
        }
    }

    // Helper method to validate new scan data format
    _validateNewScanFormat(data) {
        const errors = [];

        // Validate vitals structure
        if (data.vitals && data.vitals.status === 'completed') {
            if (!data.vitals.data || typeof data.vitals.data.heart_rate !== 'number') {
                errors.push('Invalid vitals data structure');
            }
        }

        // Validate spo2_bp structure
        if (data.spo2_bp && data.spo2_bp.status === 'completed') {
            if (!data.spo2_bp.data || typeof data.spo2_bp.data.spo2 !== 'number') {
                errors.push('Invalid SpO2/BP data structure');
            }
        }

        // Validate advanced_predictions structure
        if (data.advanced_predictions && data.advanced_predictions.status === 'completed') {
            const predictions = data.advanced_predictions.data;
            if (!predictions || typeof predictions.aafma_risk !== 'number') {
                errors.push('Invalid advanced predictions data structure');
            }
        }

        return {
            isValid: errors.length === 0,
            message: errors.length > 0 ? errors.join(', ') : 'Valid data format'
        };
    }
}

// Export the controller instance
module.exports = new FaceScanVitalController();