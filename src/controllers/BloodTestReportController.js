const BloodTestService = require('../services/BloodtestReportService');
const {logError} = require('../utils/logError');

class BloodTestController {

    allTestReports = async (request, context) => {
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

            const report = await BloodTestService.getAllTestReports(userId);

            if (!report) {
                return {
                    status: 200,
                    jsonBody: {
                        success: true,
                        data: [],
                        message: "No test reports found. Please generate one !!"
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: report
                }
            };

        } catch (error) {
            context.error('Error in allTestReports:', error);
            const err = logError('allTestReports', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'An error occurred while fetching blood test reports',
                    error: err.message
                }
            };
        }
    }

    testReport = async (request, context) => {
        try {
            const { reportId } = request.params || {};

            if (!reportId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Report ID is required'
                    }
                };
            }

            const report = await BloodTestService.getTestReportById(reportId);

            if (!report) {
                return {
                    status: 200,
                    jsonBody: {
                        success: true,
                        data: [],
                        message: "No test report found with this Id !!"
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: report
                }
            };

        } catch (error) {
            context.error('Error in testReport:', error);
            const err = logError('testReport', error, {
                reportId: request.params?.reportId,
                userId: context.user?._id
            });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'An error occurred while fetching the blood test report',
                    error: err.message
                }
            };
        }
    }

    uploadAndProcessBloodTest = async (request, context) => {
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

            const file = request.files;
            context.log("file", file);

            if (!file) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'No file uploaded'
                    }
                };
            }

            // 1. Extract and preprocess text
            let reportText;
            try {
                reportText = await BloodTestService.extractAndPreprocessText(file.file.data, file.file.name);
            } catch (extractError) {
                context.error('Error extracting text:', extractError);
                const err = logError('uploadAndProcessBloodTest-extract', extractError, { userId });
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Unable to extract text from the file'
                    }
                };
            }

            // 2. Process with GPT (with retry mechanism)
            let gptResponse;
            try {
                gptResponse = await BloodTestService.processWithGPTWithRetry(reportText);
            } catch (gptError) {
                context.error('Error processing with GPT:', gptError);
                const err = logError('uploadAndProcessBloodTest-gpt', gptError, { userId });
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Not a valid Blood test Report.'
                    }
                };
            }

            // 3. Validate and standardize the response
            let validatedResponse;
            try {
                validatedResponse = await BloodTestService.validateAndStandardizeResponse(gptResponse);
            } catch (validationError) {
                context.error('Validation error:', validationError);
                const err = logError('uploadAndProcessBloodTest-validation', validationError, { userId });
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Invalid Blood test Report uploaded.'
                    }
                };
            }

            // 4. Save to database
            const report = await BloodTestService.saveReport({
                userId,
                title: validatedResponse.title,
                summary: validatedResponse.summary,
                metrics: validatedResponse.metrics,
                charts: validatedResponse.charts,
                rawText: reportText,
                processedAt: new Date()
            });

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: report
                }
            };
        } catch (error) {
            context.error('Error in uploadAndProcessBloodTest:', error);
            const err = logError('uploadAndProcessBloodTest', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'An error occurred while processing the blood test report',
                    error: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new BloodTestController();
