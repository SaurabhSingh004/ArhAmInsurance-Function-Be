// services/BloodTestService.js
const BloodTestReport = require('../models/bloodTestReport');
const BloodTestHelper = require('../utils/testReportHelpers');
const axios = require('axios');
const pdf = require('pdf-parse');
const constants = require('../config/app.config');
const {logError} = require('../utils/logError');
const TaskService = require('../services/TaskService');
const UserRewardService = require('../services/UseRewardsService');
class BloodTestService {
    static async getLatestTestReport(userId) {
        try {
            const report = await BloodTestReport.find({ userId }).sort({ createdAt: -1 }).limit(1);
            console.log(report);
            if(report.length == 0)
            {
                return {};
            }
            return report[0];
        } catch (error) {
            throw logError('getAllTestReports', error, { userId });
        }
    }

    static async getAllTestReports(userId) {
        try {
            const reports = await BloodTestReport.find({ userId })
                .sort({ createdAt: -1 })
                .select(' _id title createdAt'); // Only fetch title and createdAt

            return reports;
        } catch (error) {
            throw logError('getAllTestReports', error, { userId });
        }
    }

    static async getTestReportById(reportId) {
        try {
            const report = await BloodTestReport.findById(reportId).sort({ createdAt: -1 });
            return report;
        } catch (error) {
            throw logError('getAllTestReports', error, { userId });
        }
    }

    
    static async extractAndPreprocessText(buffer, filename) {
        let text = await BloodTestService.extractTextFromBuffer(buffer, filename);
        
        // Standardize text format
        text = text
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
            .trim();

        // Remove common PDF artifacts
        text = text
            .replace(/Page \d+ of \d+/g, '')
            .replace(/Downloaded from .*/g, '');

        return text;
    }

    static async processWithGPTWithRetry(reportText, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await BloodTestService.processWithGPT(reportText);
                // Validate JSON structure
                const parsed = JSON.parse(response);
                if (BloodTestHelper.isValidResponseStructure(parsed)) {
                    return response;
                }
            } catch (error) {
                lastError = error;
                console.warn(`Attempt ${attempt} failed:`, error.message);
                if (attempt === maxRetries) break;
                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
        
        throw lastError;
    }

    static async validateAndStandardizeResponse(gptResponse) {
        const response = typeof gptResponse === 'string' ? JSON.parse(gptResponse) : gptResponse;

        if (!response.isValidReport) {
            throw logError('validateAndStandardizeResponse', error, { userId });
        }

        // Standardize metrics
        response.metrics = response.metrics.map(metric => {
            const standardMetric = {
                ...metric,
                value: parseFloat(metric.value) || 0,
                status: BloodTestHelper.standardizeStatus(metric.status),
                referenceValue: BloodTestHelper.standardizeReferenceValue(metric.name, metric.referenceValue)
            };

            // Validate and adjust status based on reference values
            standardMetric.status = BloodTestHelper.calculateStatus(
                standardMetric.value,
                standardMetric.referenceValue.min,
                standardMetric.referenceValue.max
            );

            return standardMetric;
        });

        return response;
    }

    static async extractTextFromBuffer(buffer, filename) {
        // Check if the file is a PDF based on its content
        if (buffer.slice(0, 4).toString() === '%PDF') {
            try {
                const data = await pdf(buffer);
                return data.text;
            } catch (error) {
                console.error('Error parsing PDF:', error);
                throw logError('extractTextFromBuffer', error, { userId });
            }
        } else if (filename.toLowerCase().endsWith('.pdf')) {
            // If the file has a .pdf extension but doesn't start with %PDF, try parsing it anyway
            try {
                const data = await pdf(buffer);
                return data.text;
            } catch (error) {
                console.log('Error parsing PDF:', error);
                throw logError('extractTextFromBuffer', error, { userId });
            }
        } else {
            // For other file types, you might need to implement different extraction methods
            throw logError('extractTextFromBuffer');
        }
    }

    static async processWithGPT(reportText) {
        const prompt = `Analyze the following text and determine if it is a blood test report. If it is, provide a structured summary in JSON format. If it is not, respond with a JSON object containing only "isValidReport": false.

                            If it is a valid blood test report, include the following fields in your JSON response:

                        1. isValidReport: true
                        2. title: A title of the report should be type of bloodreport uploaded or generated
                        3. summary: A short summary of the overall health status based on the report uploaded
                        4. metrics: Array of objects, each containing:
                            - name: String (name of the test parameter)
                            - value: Number (test result value)
                            - unit: String (unit of measurement)
                            - status: String ("Normal", "High", "Low", or "Critical")
                            - recommendation: String (specific advice based on the result)
                            - idealRange: String (for every test result value thereshould be some reference value or ideal range so store that in this field)

                        5. charts: Array of visualization objects:
                            - type: String (must be one of: "bar", "line", "pie")
                            - title: String (descriptive title for the chart)
                            - data: Array of objects containing:
                                - label: String (metric name or category)
                                - value: Number (corresponding value)

                        Processing Requirements:

                        1. Data Validation:
                        - Ensure all required fields are present
                        - Verify numerical values are valid
                        - Validate units against standard medical units
                        - Check status values are appropriate

                        2. Chart Generation:
                        - Create relevant visualizations based on the metrics
                        - Group related metrics in meaningful ways
                        - Ensure charts provide clear insights
                        - Use appropriate chart types for the data

                        3. Metrics Analysis:
                        - Compare values against standard reference ranges
                        - Generate appropriate status indicators
                        - Provide relevant recommendations for abnormal values
                        - Use consistent units
                        - provide relevant standard reference ranges for each value from test report data

                        4. Output Format:
                        - Return a single valid JSON object
                        - Maintain MongoDB/Mongoose compatible data types
                        - Include all required fields
                        - Follow the exact schema structure provided

                        The response must be a valid JSON object that can be directly stored in MongoDB using the provided schema, without any markdown formatting or additional text.

    Text to analyze:
    ${reportText}`;

        try {
            const response = await axios.post(
                `${constants.AZURE_ENDPOINT}/openai/deployments/${constants.AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=${constants.AZURE_API_VERSION}`,
                {
                    messages: [
                        { role: "system", content: "You are a medical professional specializing in interpreting blood test.js results." },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: 2048,
                    temperature: 0.1,
                    top_p: 0.1, // More focused sampling
                    frequency_penalty: 0.0,
                    presence_penalty: 0.0
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': constants.AZURE_API_KEY
                    }
                }
            );

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                let content = response.data.choices[0].message.content.trim();

                // Remove markdown code block delimiters if present
                content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
                // Attempt to parse JSON, handling potential truncation
                try {
                    const parsedContent = JSON.parse(content);
                    return JSON.stringify(parsedContent);  // Ensure valid JSON string
                } catch (parseError) {

                    // Attempt to fix truncated JSON
                    const fixedContent = BloodTestHelper.attemptToFixJSON(content);
                    if (fixedContent) {
                        return fixedContent;
                    }

                    throw logError('processWithGPT', error, { reportText });
                }
            } else {
                throw logError('processWithGPT', error, { reportText });
            }
        } catch (error) {
            throw logError('processWithGPT', error, { reportText });
        }
    }

    static async saveReport(reportData) {
        try {
            // Create new report instance
            const report = new BloodTestReport({
                userId: reportData.userId,
                title: reportData.title || 'Blood Test Report',
                summary: reportData.summary || 'No summary available',
                metrics: reportData.metrics.map(metric => ({
                    name: metric.name,
                    value: metric.value,
                    unit: metric.unit,
                    status: metric.status,
                    recommendation: metric.recommendation,
                    idealRange: metric.idealRange
                })),
                charts: reportData.charts.map(chart => ({
                    type: chart.type,
                    title: chart.title,
                    data: chart.data.map(item => ({
                        label: item.label,
                        value: item.value
                    }))
                })),
                reportPath: reportData.reportPath, // If you're storing the file path
                rawText: reportData.rawText,
                createdAt: new Date(),
                updatedAt: new Date()
            });
 
            // Save to database
            const savedReport = await report.save();
            const uploadTestReportReward = await TaskService.getTaskByFeatureType("Upload Blood Test");
            console.log(reportData);
            await UserRewardService.updateDailyTaskCompletion(reportData.userId, uploadTestReportReward._id, uploadTestReportReward.points);
            if (!savedReport) {
                throw logError('saveReport', error);
            }
 
            return savedReport;
 
        } catch (error) {
            throw logError('saveReport', error);
        }
    }
}

module.exports = BloodTestService;