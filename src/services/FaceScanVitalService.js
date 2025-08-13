const {logError} = require('../utils/logError');
const faceScanVitalDataModel = require('../models/faceScanVital');
const StreakService = require('../services/StreakService');
const FitnessDataService = require('../services/FitnessDataService');
const User = require('../models/userProfile');
const mongoose = require('mongoose');
const axios = require('axios'); // Add this for HTTP requests

// API Configuration
const API_BASE_URL = 'https://vital-scan.happytree-df551ac3.southindia.azurecontainerapps.io';

class FaceScanVitalService {
    static async addFaceScanVitalData(data) {
        if (!data.userId) {
            throw new Error('User ID is required');
        }

        const user = await User.findOne({_id: data.userId});
        if(!user) {
            throw new Error('User not found with ID.');
        }
        
        try {
            // Map the direct payload format to our schema
            const faceScanVitalData = new faceScanVitalDataModel({
                userId: user._id,
                video_link: data.video_link,
                heart_rate: data.heart_rate,
                respiratory_rate: data.respiratory_rate,
                spo2: data.spo2,
                bp_systolic: data.bp_systolic,
                bp_diastolic: data.bp_diastolic,
                aafma_risk: data.aafma_risk,
                aafma_probability: data.aafma_probability,
                aafma_category: data.aafma_category,
                cholesterol_level: data.cholesterol_level,
                cholesterol_category: data.cholesterol_category,
                diabetes_category: data.diabetes_category,
                diabetes_risk: data.diabetes_risk,
                hba1c_estimated: data.hba1c_estimated,
                overall_cardiovascular_risk: data.overall_cardiovascular_risk,
                aafma_confidence: data.aafma_confidence,
                cholesterol_confidence: data.cholesterol_confidence,
                diabetes_confidence: data.diabetes_confidence,
                scan_status: 'completed'
            });
            
            const savedData = await faceScanVitalData.save();
            
            // Update fitness data with heart rate
            if (savedData.heart_rate) {
                await FitnessDataService.addHeartRateData(user._id.toString(), savedData.heart_rate);
            }
            
            await StreakService.syncFaceScanStreakData(user._id.toString(), Date.now());
            
            if (!savedData) {
                throw new Error('Failed to save face scan vital data');
            }

            return this._formatDirectResponse(savedData);
        } catch (error) {
            console.log("addfacescandata , ", error);
            throw logError('addFaceScanVitalData', error, {data});
        }
    }

    static async getAllFaceScanVitalData(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            // Convert userId to ObjectId if it's a string
            const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? 
                (typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId) : userId;
                
            const data = await faceScanVitalDataModel.find({userId: userObjectId}).sort({ createdAt: -1 });
            if (!data) {
                throw new Error('No records found');
            }

            return data.map(record => this._formatDirectResponse(record));
        } catch (error) {
            throw logError('getAllFaceScanVitalData', error, {userId});
        }
    }

    static async getLatestFaceScanVitalData(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            // Convert userId to ObjectId if it's a string
            const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? 
                (typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId) : userId;
            const data = await faceScanVitalDataModel.findOne({
                userId: userObjectId
            }).sort({ createdAt: -1 });
            
            if (!data) {
                return null;
            }
            return this._formatDirectResponse(data);
        } catch (error) {
            throw logError('getLatestFaceScanVitalData', error, {userId});
        }
    }

    static async getFaceScanVitalDataById(id) {
        if (!id) {
            throw new Error('Record ID is required');
        }

        try {
            const data = await faceScanVitalDataModel.findById(id);
            if (!data) {
                throw new Error('No record found');
            }

            return this._formatDirectResponse(data);
        } catch (error) {
            throw logError('getFaceScanVitalDataById', error, {id});
        }
    }

    static async getFaceScanVitalsByDate(userId, date) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        if (!date) {
            throw new Error('Date is required');
        }

        try {
            // Convert userId to ObjectId if it's a string
            const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? 
                (typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId) : userId;
                
            // Create start and end date for the given date
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            const data = await faceScanVitalDataModel.find({
                userId: userObjectId,
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            }).sort({ createdAt: -1 });

            if (!data || data.length === 0) {
                throw new Error('No records found for the specified date');
            }

            return data.map(record => this._formatDirectResponse(record));
        } catch (error) {
            throw logError('getFaceScanVitalsByDate', error, { userId, date });
        }
    }

    static _formatDirectResponse(data) {
        // Helper function to round numbers to 2 decimal places
        const roundTo2 = (value) => {
            return value !== null && value !== undefined ? Math.round(value * 100) / 100 : value;
        };

        return {
            _id: data._id,
            userId: data.userId,
            heart_rate: roundTo2(data.heart_rate),
            respiratory_rate: roundTo2(data.respiratory_rate),
            spo2: roundTo2(data.spo2),
            bp_systolic: roundTo2(data.bp_systolic),
            bp_diastolic: roundTo2(data.bp_diastolic),
            aafma_risk: roundTo2(data.aafma_risk),
            aafma_probability: roundTo2(data.aafma_probability),
            aafma_category: data.aafma_category,
            cholesterol_level: roundTo2(data.cholesterol_level),
            cholesterol_category: data.cholesterol_category,
            diabetes_category: data.diabetes_category,
            diabetes_risk: roundTo2(data.diabetes_risk),
            hba1c_estimated: roundTo2(data.hba1c_estimated),
            overall_cardiovascular_risk: roundTo2(data.overall_cardiovascular_risk),
            aafma_confidence: roundTo2(data.aafma_confidence),
            cholesterol_confidence: roundTo2(data.cholesterol_confidence),
            diabetes_confidence: roundTo2(data.diabetes_confidence),
            wellnessScore: roundTo2(this._calculateWellnessScore(data)),
            createdAt: data.createdAt
        };
    }

    static _calculateWellnessScore(data) {
        const normalize = (value, min_val, max_val) => {
            if (value === undefined || value === null) return 0.5; // Default neutral score
            return Math.max(0, Math.min(1, (value - min_val) / (max_val - min_val)));
        };

        // Use only new fields (no legacy fallbacks)
        const diastolic = data.bp_diastolic;
        const systolic = data.bp_systolic;
        const heart_rate = data.heart_rate;
        const breathing_rate = data.respiratory_rate;
        const blood_oxygen = data.spo2;

        const parameters = [
            normalize(diastolic, 60, 80),
            normalize(systolic, 90, 120),
            normalize(heart_rate, 60, 100),
            normalize(breathing_rate, 12, 20),
            normalize(blood_oxygen, 94, 100),
        ];

        // Filter out undefined parameters and calculate average
        const validParameters = parameters.filter(p => p !== undefined && !isNaN(p));
        if (validParameters.length === 0) return 0;

        const wellness_score = (validParameters.reduce((sum, value) => sum + value, 0) / validParameters.length) * 100;
        return Math.abs(wellness_score.toFixed(2));
    }

    // Method to get health risk summary
    static getHealthRiskSummary(data) {
        const summary = {
            cardiovascular_risk: data.overall_cardiovascular_risk || 'Unknown',
            aafma_status: data.aafma_category || 'Unknown',
            cholesterol_status: data.cholesterol_category || 'Unknown',
            diabetes_status: data.diabetes_category || 'Unknown',
            confidence_scores: {
                aafma: data.aafma_confidence,
                cholesterol: data.cholesterol_confidence,
                diabetes: data.diabetes_confidence
            }
        };

        return summary;
    }

    // Method to get vital trends (for dashboard analytics)
    static async getVitalTrends(userId, days = 30) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            // Convert userId to ObjectId if it's a string
            const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? 
                (typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId) : userId;
                
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const data = await faceScanVitalDataModel.find({
                userId: userObjectId,
                createdAt: { $gte: startDate }
            }).sort({ createdAt: 1 });

            return data.map(record => ({
                date: record.createdAt,
                heart_rate: record.heart_rate,
                blood_pressure: {
                    systolic: record.bp_systolic,
                    diastolic: record.bp_diastolic
                },
                spo2: record.spo2,
                wellness_score: this._calculateWellnessScore(record),
                cardiovascular_risk: record.overall_cardiovascular_risk
            }));
        } catch (error) {
            throw logError('getVitalTrends', error, { userId, days });
        }
    }

    // Updated method to fetch face scans from external API
    static async getFaceScans(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            // Make API call to get user logs
            const response = await axios.get(`${API_BASE_URL}/user-logs`, {
                params: { user_id: userId },
                timeout: 10000, // 10 second timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.data || !response.data.logs) {
                throw new Error('Invalid response format from API');
            }

            const userData = response.data.logs;
            
            if (!userData || userData.length === 0) {
                return [];
            }

            // Sort by createdAt descending
            const sortedData = userData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return sortedData.map(record => {
                return {
                    logId: record._id,
                    userId: record.userId,
                    scanDate: record.createdAt,
                    vitals: {
                        heartRate: this._roundTo2(this._parseNumericValue(record.heart_rate)),
                        respiratoryRate: this._roundTo2(this._parseNumericValue(record.respiratory_rate))
                    },
                    scanStatus: record.status || 'completed',
                    type: record.type || 'SCAN',
                    comments: record.comments || '',
                    wellnessScore: this._calculateWellnessScoreFromApiData(record),
                    videoLink: record.video_link || null,
                    appCode: record.appCode || 'NA',
                    cholesterol: this._roundTo2(this._parseNumericValue(record.cholesterol))
                };
            });
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('API request timeout - please try again');
            } else if (error.response) {
                throw new Error(`API Error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
            } else if (error.request) {
                throw new Error('Network error - unable to reach API');
            }
            throw logError('getFaceScans', error, { userId });
        }
    }

    // Updated method to fetch face scan vitals from external API
    static async getFaceScanVitals(logId, options = {}) {
        if (!logId) {
            throw new Error('Log ID is required');
        }

        try {
            const { limit = 10, page = 1, startDate, endDate } = options;

            // Make API call to get specific log details
            const response = await axios.get(`${API_BASE_URL}/logs/${logId}`, {
                timeout: 10000, // 10 second timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.data || !response.data.log) {
                throw new Error('Invalid response format from API or log not found');
            }

            const record = response.data.log;

            // Apply date filtering if provided (though for single record it might not be needed)
            if (startDate || endDate) {
                const recordDate = new Date(record.createdAt);
                
                if (startDate) {
                    const start = new Date(startDate);
                    if (isNaN(start.getTime())) {
                        throw new Error('Invalid start date format');
                    }
                    start.setHours(0, 0, 0, 0);
                    if (recordDate < start) {
                        throw new Error('No face scan vital records found in date range');
                    }
                }
                
                if (endDate) {
                    const end = new Date(endDate);
                    if (isNaN(end.getTime())) {
                        throw new Error('Invalid end date format');
                    }
                    end.setHours(23, 59, 59, 999);
                    if (recordDate > end) {
                        throw new Error('No face scan vital records found in date range');
                    }
                }
            }

            // Format detailed vital log
            const formattedData = [this._formatDetailedVitalLogFromApi(record)];

            // Calculate summary statistics (for single record)
            const summary = this._calculateVitalsSummaryFromApiData([record]);

            return {
                data: formattedData,
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalRecords: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                    limit: limit
                },
                summary: summary
            };
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('API request timeout - please try again');
            } else if (error.response) {
                if (error.response.status === 404) {
                    throw new Error('Face scan record not found');
                }
                throw new Error(`API Error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
            } else if (error.request) {
                throw new Error('Network error - unable to reach API');
            }
            throw logError('getFaceScanVitals', error, { logId, options });
        }
    }

    // Helper method to parse numeric values (handles "null" strings and null values)
    static _parseNumericValue(value) {
        if (value === null || value === undefined || value === "null" || value === "") {
            return null;
        }
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    }

    // Helper method to calculate wellness score from API data
    static _calculateWellnessScoreFromApiData(record) {
        const normalize = (value, min_val, max_val) => {
            if (value === undefined || value === null) return 0.5;
            return Math.max(0, Math.min(1, (value - min_val) / (max_val - min_val)));
        };

        const heartRate = this._parseNumericValue(record.heart_rate);
        const respiratoryRate = this._parseNumericValue(record.respiratory_rate);
        const spo2 = this._parseNumericValue(record.spo2);
        const bpSystolic = this._parseNumericValue(record.bp_systolic);
        const bpDiastolic = this._parseNumericValue(record.bp_diastolic);

        const parameters = [
            normalize(bpDiastolic, 60, 80),
            normalize(bpSystolic, 90, 120),
            normalize(heartRate, 60, 100),
            normalize(respiratoryRate, 12, 20),
            normalize(spo2, 94, 100),
        ];

        const validParameters = parameters.filter(p => p !== undefined && !isNaN(p));
        if (validParameters.length === 0) return 0;

        const wellness_score = (validParameters.reduce((sum, value) => sum + value, 0) / validParameters.length) * 100;
        return Math.abs(parseFloat(wellness_score.toFixed(2)));
    }

    // Helper method to format detailed vital log from API data
    static _formatDetailedVitalLogFromApi(record) {
        const vitals = record.faceScanResults?.results?.vitals?.data || {};
        const spo2Bp = record.faceScanResults?.results?.spo2_bp?.data || {};
        const advancedPredictions = record.faceScanResults?.results?.advanced_predictions?.data || 
                                record.faceScanResults?.advanced_predictions || {};
        const videoInfo = record.faceScanResults?.results?.video_info || {};
        const results = record.faceScanResults?.results || {};

        return {
            logId: record._id,
            userId: record.userId,
            timestamp: record.createdAt,
            scanDetails: {
                status: record.status || 'completed',
                type: record.type || 'SCAN',
                comments: record.comments || '',
                taskId: record.faceScanResults?.task_id,
                processingTime: this._roundTo2(results.processing_time),
                deviceInfo: {
                    deviceId: record.deviceId || 'Unknown',
                    browser: record.browser || 'Unknown',
                    ipAddress: record.ipAddress || 'Unknown'
                },
                videoInfo: {
                    fps: this._roundTo2(videoInfo.fps),
                    frameCount: videoInfo.frame_count,
                    duration: this._roundTo2(videoInfo.duration),
                    resolution: videoInfo.width && videoInfo.height ? `${videoInfo.width}x${videoInfo.height}` : 'Unknown'
                },
                confidence: {
                    overall: this._calculateOverallConfidenceFromApiResults(record.faceScanResults),
                    aafma: this._roundTo2(advancedPredictions.aafma_confidence),
                    cholesterol: this._roundTo2(advancedPredictions.cholesterol_confidence),
                    diabetes: this._roundTo2(advancedPredictions.diabetes_confidence)
                },
                videoLink: record.video_link || results.video_link,
                appCode: record.appCode || 'NA'
            },
            vitals: {
                cardiovascular: {
                    heartRate: {
                        value: this._roundTo2(vitals.heart_rate || this._parseNumericValue(record.heart_rate)),
                        unit: 'bpm',
                        status: this._getVitalStatus(vitals.heart_rate || this._parseNumericValue(record.heart_rate), 60, 100, 'range_optimal')
                    },
                    bloodPressure: {
                        systolic: {
                            value: this._roundTo2(spo2Bp.bp_systolic || this._parseNumericValue(record.bp_systolic)),
                            unit: 'mmHg',
                            status: this._getVitalStatus(spo2Bp.bp_systolic || this._parseNumericValue(record.bp_systolic), 90, 120, 'range_optimal')
                        },
                        diastolic: {
                            value: this._roundTo2(spo2Bp.bp_diastolic || this._parseNumericValue(record.bp_diastolic)),
                            unit: 'mmHg',
                            status: this._getVitalStatus(spo2Bp.bp_diastolic || this._parseNumericValue(record.bp_diastolic), 60, 80, 'range_optimal')
                        }
                    },
                    pulsePreassure: {
                        value: this._roundTo2(results.pulse_pressure || record.faceScanResults?.pulse_pressure),
                        unit: 'mmHg'
                    },
                    meanArterialPressure: {
                        value: this._roundTo2(results.mean_arterial_pressure || record.faceScanResults?.mean_arterial_pressure),
                        unit: 'mmHg'
                    },
                    shockIndex: {
                        value: this._roundTo2(results.shock_index || record.faceScanResults?.shock_index)
                    },
                    ratePressureProduct: {
                        value: this._roundTo2(results.rate_pressure_product || record.faceScanResults?.rate_pressure_product)
                    }
                },
                respiratory: {
                    respiratoryRate: {
                        value: this._roundTo2(vitals.respiratory_rate || this._parseNumericValue(record.respiratory_rate)),
                        unit: 'breaths/min',
                        status: this._getVitalStatus(vitals.respiratory_rate || this._parseNumericValue(record.respiratory_rate), 12, 20, 'range_optimal')
                    },
                    oxygenSaturation: {
                        value: this._roundTo2(spo2Bp.spo2 || this._parseNumericValue(record.spo2)),
                        unit: '%',
                        status: this._getVitalStatus(spo2Bp.spo2 || this._parseNumericValue(record.spo2), 95, 100, 'higher_better')
                    }
                }
            },
            healthMetrics: {
                wellnessScore: {
                    value: this._roundTo2(this._calculateWellnessScoreFromApiResults(record.faceScanResults, record)),
                    grade: this._getWellnessGrade(this._calculateWellnessScoreFromApiResults(record.faceScanResults, record))
                },
                cardiovascularRisk: {
                    value: this._roundTo2(advancedPredictions.overall_cardiovascular_risk),
                    category: this._getRiskCategory(advancedPredictions.overall_cardiovascular_risk)
                },
                cholesterol: {
                    level: this._roundTo2(advancedPredictions.cholesterol_level || this._parseNumericValue(record.cholesterol)),
                    category: advancedPredictions.cholesterol_category || 'Unknown',
                    unit: 'mg/dL'
                },
                diabetes: {
                    risk: this._roundTo2(advancedPredictions.diabetes_risk),
                    category: advancedPredictions.diabetes_category || 'Unknown',
                    hba1c: this._roundTo2(advancedPredictions.hba1c_estimated)
                },
                aafma: {
                    risk: this._roundTo2(advancedPredictions.aafma_risk),
                    probability: this._roundTo2(advancedPredictions.aafma_probability),
                    category: advancedPredictions.aafma_category || 'Unknown'
                }
            },
            faceRecognitionStatus: record.faceRecognitionStatus || 'success',
            insights: this._generateHealthInsightsFromApiResults(record.faceScanResults, record)
        };
    }

    static _calculateVitalsSummaryFromApiData(userData) {
        if (!userData || userData.length === 0) {
            return null;
        }

        try {
            let totalHeartRate = 0, totalSystolic = 0, totalDiastolic = 0;
            let totalSpO2 = 0, totalRespiratoryRate = 0, totalWellnessScore = 0;
            let validHeartRate = 0, validSystolic = 0, validDiastolic = 0;
            let validSpO2 = 0, validRespiratoryRate = 0, validWellnessScore = 0;

            let earliestScan = new Date(userData[0].createdAt);
            let latestScan = new Date(userData[0].createdAt);

            userData.forEach(record => {
                const vitals = record.faceScanResults?.results?.vitals?.data || {};
                const spo2Bp = record.faceScanResults?.results?.spo2_bp?.data || {};
                const scanDate = new Date(record.createdAt);

                if (scanDate < earliestScan) earliestScan = scanDate;
                if (scanDate > latestScan) latestScan = scanDate;

                const heartRate = vitals.heart_rate || this._parseNumericValue(record.heart_rate);
                const systolic = spo2Bp.bp_systolic || this._parseNumericValue(record.bp_systolic);
                const diastolic = spo2Bp.bp_diastolic || this._parseNumericValue(record.bp_diastolic);
                const spo2 = spo2Bp.spo2 || this._parseNumericValue(record.spo2);
                const respiratoryRate = vitals.respiratory_rate || this._parseNumericValue(record.respiratory_rate);

                if (heartRate) {
                    totalHeartRate += heartRate;
                    validHeartRate++;
                }

                if (systolic) {
                    totalSystolic += systolic;
                    validSystolic++;
                }

                if (diastolic) {
                    totalDiastolic += diastolic;
                    validDiastolic++;
                }

                if (spo2) {
                    totalSpO2 += spo2;
                    validSpO2++;
                }

                if (respiratoryRate) {
                    totalRespiratoryRate += respiratoryRate;
                    validRespiratoryRate++;
                }

                const wellnessScore = this._calculateWellnessScoreFromApiResults(record.faceScanResults, record);
                if (wellnessScore) {
                    totalWellnessScore += wellnessScore;
                    validWellnessScore++;
                }
            });

            return {
                totalScans: userData.length,
                dateRange: {
                    earliest: earliestScan,
                    latest: latestScan
                },
                averages: {
                    heartRate: validHeartRate > 0 ? this._roundTo2(totalHeartRate / validHeartRate) : null,
                    bloodPressure: {
                        systolic: validSystolic > 0 ? this._roundTo2(totalSystolic / validSystolic) : null,
                        diastolic: validDiastolic > 0 ? this._roundTo2(totalDiastolic / validDiastolic) : null
                    },
                    oxygenSaturation: validSpO2 > 0 ? this._roundTo2(totalSpO2 / validSpO2) : null,
                    respiratoryRate: validRespiratoryRate > 0 ? this._roundTo2(totalRespiratoryRate / validRespiratoryRate) : null,
                    wellnessScore: validWellnessScore > 0 ? this._roundTo2(totalWellnessScore / validWellnessScore) : null
                }
            };
        } catch (error) {
            return null;
        }
    }

    static _calculateWellnessScoreFromApiResults(faceScanResults, record) {
        if (!faceScanResults && !record) return 0;

        const vitals = faceScanResults?.results?.vitals?.data || {};
        const spo2Bp = faceScanResults?.results?.spo2_bp?.data || {};

        const normalize = (value, min_val, max_val) => {
            if (value === undefined || value === null) return 0.5;
            return Math.max(0, Math.min(1, (value - min_val) / (max_val - min_val)));
        };

        // Use data from faceScanResults first, then fallback to record data
        const heartRate = vitals.heart_rate || this._parseNumericValue(record?.heart_rate);
        const respiratoryRate = vitals.respiratory_rate || this._parseNumericValue(record?.respiratory_rate);
        const spo2 = spo2Bp.spo2 || this._parseNumericValue(record?.spo2);
        const bpSystolic = spo2Bp.bp_systolic || this._parseNumericValue(record?.bp_systolic);
        const bpDiastolic = spo2Bp.bp_diastolic || this._parseNumericValue(record?.bp_diastolic);

        const parameters = [
            normalize(bpDiastolic, 60, 80),
            normalize(bpSystolic, 90, 120),
            normalize(heartRate, 60, 100),
            normalize(respiratoryRate, 12, 20),
            normalize(spo2, 94, 100),
        ];

        const validParameters = parameters.filter(p => p !== undefined && !isNaN(p));
        if (validParameters.length === 0) return 0;

        const wellness_score = (validParameters.reduce((sum, value) => sum + value, 0) / validParameters.length) * 100;
        return Math.abs(parseFloat(wellness_score.toFixed(2)));
    }

    static _calculateOverallConfidenceFromApiResults(faceScanResults) {
        const advancedPredictions = faceScanResults?.results?.advanced_predictions?.data || 
                                faceScanResults?.advanced_predictions || {};
        
        const confidences = [
            advancedPredictions.aafma_confidence,
            advancedPredictions.cholesterol_confidence,
            advancedPredictions.diabetes_confidence
        ].filter(c => c !== null && c !== undefined);
        
        return confidences.length > 0 ? 
            this._roundTo2(confidences.reduce((sum, c) => sum + c, 0) / confidences.length) : null;
    }

    static _generateHealthInsightsFromApiResults(faceScanResults, record) {
        const insights = [];
        
        if (!faceScanResults && !record) return insights;

        const vitals = faceScanResults?.results?.vitals?.data || {};
        const spo2Bp = faceScanResults?.results?.spo2_bp?.data || {};
        const advancedPredictions = faceScanResults?.results?.advanced_predictions?.data || 
                                faceScanResults?.advanced_predictions || {};
        
        // Use data from faceScanResults first, then fallback to record data
        const heartRate = vitals.heart_rate || this._parseNumericValue(record?.heart_rate);
        const spo2 = spo2Bp.spo2 || this._parseNumericValue(record?.spo2);
        const bpSystolic = spo2Bp.bp_systolic || this._parseNumericValue(record?.bp_systolic);
        const bpDiastolic = spo2Bp.bp_diastolic || this._parseNumericValue(record?.bp_diastolic);
        
        // Heart rate insights
        if (heartRate) {
            if (heartRate > 100) {
                insights.push({
                    type: 'warning',
                    category: 'cardiovascular',
                    message: 'Elevated heart rate detected. Consider rest and hydration.'
                });
            } else if (heartRate < 60) {
                insights.push({
                    type: 'info',
                    category: 'cardiovascular',
                    message: 'Low heart rate may indicate good fitness or require medical attention.'
                });
            }
        }
        
        // Blood pressure insights
        if (bpSystolic > 130 || bpDiastolic > 80) {
            insights.push({
                type: 'warning',
                category: 'cardiovascular',
                message: 'Blood pressure is elevated. Monitor regularly and consult healthcare provider.'
            });
        }
        
        // SpO2 insights
        if (spo2 && spo2 < 95) {
            insights.push({
                type: 'alert',
                category: 'respiratory',
                message: 'Low oxygen saturation detected. Seek medical attention if persistent.'
            });
        }
        
        // Cholesterol insights
        if (advancedPredictions.cholesterol_category === 'Borderline High' || 
            advancedPredictions.cholesterol_category === 'High') {
            insights.push({
                type: 'warning',
                category: 'metabolic',
                message: 'Cholesterol levels need attention. Consider dietary changes and regular exercise.'
            });
        }
        
        // Diabetes insights
        if (advancedPredictions.diabetes_risk > 0.01) {
            insights.push({
                type: 'info',
                category: 'metabolic',
                message: 'Monitor blood sugar levels and maintain healthy lifestyle habits.'
            });
        }
        
        // Wellness score insights
        const wellnessScore = this._calculateWellnessScoreFromApiResults(faceScanResults, record);
        if (wellnessScore >= 80) {
            insights.push({
                type: 'positive',
                category: 'overall',
                message: 'Excellent wellness score! Keep maintaining your healthy lifestyle.'
            });
        } else if (wellnessScore < 60) {
            insights.push({
                type: 'improvement',
                category: 'overall',
                message: 'Consider lifestyle improvements for better health outcomes.'
            });
        }
        
        // Cardiovascular risk insights
        if (advancedPredictions.overall_cardiovascular_risk > 20) {
            insights.push({
                type: 'alert',
                category: 'cardiovascular',
                message: 'High cardiovascular risk detected. Consult with healthcare provider immediately.'
            });
        } else if (advancedPredictions.overall_cardiovascular_risk > 10) {
            insights.push({
                type: 'warning',
                category: 'cardiovascular',
                message: 'Moderate cardiovascular risk. Consider lifestyle modifications and regular monitoring.'
            });
        }
        
        return insights;
    }

    static _roundTo2(value) {
        return value !== null && value !== undefined ? Math.round(value * 100) / 100 : value;
    }

    static _calculateOverallConfidenceFromResults(faceScanResults) {
        const advancedPredictions = faceScanResults?.results?.advanced_predictions?.data || 
                                faceScanResults?.advanced_predictions || {};
        
        const confidences = [
            advancedPredictions.aafma_confidence,
            advancedPredictions.cholesterol_confidence,
            advancedPredictions.diabetes_confidence
        ].filter(c => c !== null && c !== undefined);
        
        return confidences.length > 0 ? 
            this._roundTo2(confidences.reduce((sum, c) => sum + c, 0) / confidences.length) : null;
    }

    static _calculateWellnessScoreFromResults(faceScanResults) {
        if (!faceScanResults || !faceScanResults.results) return 0;

        const vitals = faceScanResults.results.vitals?.data || {};
        const spo2Bp = faceScanResults.results.spo2_bp?.data || {};

        const normalize = (value, min_val, max_val) => {
            if (value === undefined || value === null) return 0.5;
            return Math.max(0, Math.min(1, (value - min_val) / (max_val - min_val)));
        };

        const parameters = [
            normalize(spo2Bp.bp_diastolic, 60, 80),
            normalize(spo2Bp.bp_systolic, 90, 120),
            normalize(vitals.heart_rate, 60, 100),
            normalize(vitals.respiratory_rate, 12, 20),
            normalize(spo2Bp.spo2, 94, 100),
        ];

        const validParameters = parameters.filter(p => p !== undefined && !isNaN(p));
        if (validParameters.length === 0) return 0;

        const wellness_score = (validParameters.reduce((sum, value) => sum + value, 0) / validParameters.length) * 100;
        return Math.abs(wellness_score.toFixed(2));
    }

    static _getVitalStatus(value, min, max, type) {
        if (value === null || value === undefined) return 'unknown';
        
        switch (type) {
            case 'range_optimal':
                return value >= min && value <= max ? 'optimal' : 
                    value < min ? 'low' : 'high';
            case 'higher_better':
                return value >= min ? 'optimal' : 'low';
            case 'lower_better':
                return value <= max ? 'optimal' : 'high';
            default:
                return 'unknown';
        }
    }

    static _getWellnessGrade(score) {
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    }

    static _getRiskCategory(risk) {
        if (risk === null || risk === undefined) return 'Unknown';
        if (risk < 5) return 'Low';
        if (risk < 10) return 'Moderate';
        if (risk < 20) return 'High';
        return 'Very High';
    }

    static _generateHealthInsightsFromResults(faceScanResults) {
        const insights = [];
        
        if (!faceScanResults || !faceScanResults.results) return insights;

        const vitals = faceScanResults.results.vitals?.data || {};
        const spo2Bp = faceScanResults.results.spo2_bp?.data || {};
        const advancedPredictions = faceScanResults.results.advanced_predictions?.data || 
                                faceScanResults.advanced_predictions || {};
        
        // Heart rate insights
        if (vitals.heart_rate) {
            if (vitals.heart_rate > 100) {
                insights.push({
                    type: 'warning',
                    category: 'cardiovascular',
                    message: 'Elevated heart rate detected. Consider rest and hydration.'
                });
            } else if (vitals.heart_rate < 60) {
                insights.push({
                    type: 'info',
                    category: 'cardiovascular',
                    message: 'Low heart rate may indicate good fitness or require medical attention.'
                });
            }
        }
        
        // Blood pressure insights
        if (spo2Bp.bp_systolic > 130 || spo2Bp.bp_diastolic > 80) {
            insights.push({
                type: 'warning',
                category: 'cardiovascular',
                message: 'Blood pressure is elevated. Monitor regularly and consult healthcare provider.'
            });
        }
        
        // SpO2 insights
        if (spo2Bp.spo2 && spo2Bp.spo2 < 95) {
            insights.push({
                type: 'alert',
                category: 'respiratory',
                message: 'Low oxygen saturation detected. Seek medical attention if persistent.'
            });
        }
        
        // Cholesterol insights
        if (advancedPredictions.cholesterol_category === 'Borderline High' || 
            advancedPredictions.cholesterol_category === 'High') {
            insights.push({
                type: 'warning',
                category: 'metabolic',
                message: 'Cholesterol levels need attention. Consider dietary changes and regular exercise.'
            });
        }
        
        // Diabetes insights
        if (advancedPredictions.diabetes_risk > 0.01) {
            insights.push({
                type: 'info',
                category: 'metabolic',
                message: 'Monitor blood sugar levels and maintain healthy lifestyle habits.'
            });
        }
        
        // Wellness score insights
        const wellnessScore = this._calculateWellnessScoreFromResults(faceScanResults);
        if (wellnessScore >= 80) {
            insights.push({
                type: 'positive',
                category: 'overall',
                message: 'Excellent wellness score! Keep maintaining your healthy lifestyle.'
            });
        } else if (wellnessScore < 60) {
            insights.push({
                type: 'improvement',
                category: 'overall',
                message: 'Consider lifestyle improvements for better health outcomes.'
            });
        }
        
        // Cardiovascular risk insights
        if (advancedPredictions.overall_cardiovascular_risk > 20) {
            insights.push({
                type: 'alert',
                category: 'cardiovascular',
                message: 'High cardiovascular risk detected. Consult with healthcare provider immediately.'
            });
        } else if (advancedPredictions.overall_cardiovascular_risk > 10) {
            insights.push({
                type: 'warning',
                category: 'cardiovascular',
                message: 'Moderate cardiovascular risk. Consider lifestyle modifications and regular monitoring.'
            });
        }
        
        return insights;
    }

    // Legacy methods for backward compatibility with existing database operations
    static _formatDetailedVitalLog(record) {
        const vitals = record.faceScanResults?.results?.vitals?.data || {};
        const spo2Bp = record.faceScanResults?.results?.spo2_bp?.data || {};
        const advancedPredictions = record.faceScanResults?.results?.advanced_predictions?.data || 
                                record.faceScanResults?.advanced_predictions || {};
        const videoInfo = record.faceScanResults?.results?.video_info || {};
        const results = record.faceScanResults?.results || {};

        return {
            logId: record._id,
            userId: record.userId,
            timestamp: record.createdAt,
            scanDetails: {
                status: record.status || 'completed',
                type: record.type,
                comments: record.comments,
                taskId: record.faceScanResults?.task_id,
                processingTime: this._roundTo2(results.processing_time),
                deviceInfo: {
                    deviceId: record.deviceId,
                    browser: record.browser,
                    ipAddress: record.ipAddress
                },
                videoInfo: {
                    fps: this._roundTo2(videoInfo.fps),
                    frameCount: videoInfo.frame_count,
                    duration: this._roundTo2(videoInfo.duration),
                    resolution: `${videoInfo.width}x${videoInfo.height}`
                },
                confidence: {
                    overall: this._calculateOverallConfidenceFromResults(record.faceScanResults),
                    aafma: this._roundTo2(advancedPredictions.aafma_confidence),
                    cholesterol: this._roundTo2(advancedPredictions.cholesterol_confidence),
                    diabetes: this._roundTo2(advancedPredictions.diabetes_confidence)
                }
            },
            vitals: {
                cardiovascular: {
                    heartRate: {
                        value: this._roundTo2(vitals.heart_rate),
                        unit: 'bpm',
                        status: this._getVitalStatus(vitals.heart_rate, 60, 100, 'range_optimal')
                    },
                    bloodPressure: {
                        systolic: {
                            value: this._roundTo2(spo2Bp.bp_systolic),
                            unit: 'mmHg',
                            status: this._getVitalStatus(spo2Bp.bp_systolic, 90, 120, 'range_optimal')
                        },
                        diastolic: {
                            value: this._roundTo2(spo2Bp.bp_diastolic),
                            unit: 'mmHg',
                            status: this._getVitalStatus(spo2Bp.bp_diastolic, 60, 80, 'range_optimal')
                        }
                    },
                    pulsePreassure: {
                        value: this._roundTo2(results.pulse_pressure),
                        unit: 'mmHg'
                    },
                    meanArterialPressure: {
                        value: this._roundTo2(results.mean_arterial_pressure),
                        unit: 'mmHg'
                    },
                    shockIndex: {
                        value: this._roundTo2(results.shock_index)
                    },
                    ratePressureProduct: {
                        value: this._roundTo2(results.rate_pressure_product)
                    }
                },
                respiratory: {
                    respiratoryRate: {
                        value: this._roundTo2(vitals.respiratory_rate),
                        unit: 'breaths/min',
                        status: this._getVitalStatus(vitals.respiratory_rate, 12, 20, 'range_optimal')
                    },
                    oxygenSaturation: {
                        value: this._roundTo2(spo2Bp.spo2),
                        unit: '%',
                        status: this._getVitalStatus(spo2Bp.spo2, 95, 100, 'higher_better')
                    }
                }
            },
            healthMetrics: {
                wellnessScore: {
                    value: this._roundTo2(this._calculateWellnessScoreFromResults(record.faceScanResults)),
                    grade: this._getWellnessGrade(this._calculateWellnessScoreFromResults(record.faceScanResults))
                },
                cardiovascularRisk: {
                    value: this._roundTo2(advancedPredictions.overall_cardiovascular_risk),
                    category: this._getRiskCategory(advancedPredictions.overall_cardiovascular_risk)
                },
                cholesterol: {
                    level: this._roundTo2(advancedPredictions.cholesterol_level),
                    category: advancedPredictions.cholesterol_category || 'Unknown',
                    unit: 'mg/dL'
                },
                diabetes: {
                    risk: this._roundTo2(advancedPredictions.diabetes_risk),
                    category: advancedPredictions.diabetes_category || 'Unknown',
                    hba1c: this._roundTo2(advancedPredictions.hba1c_estimated)
                },
                aafma: {
                    risk: this._roundTo2(advancedPredictions.aafma_risk),
                    probability: this._roundTo2(advancedPredictions.aafma_probability),
                    category: advancedPredictions.aafma_category || 'Unknown'
                }
            },
            faceRecognitionStatus: record.faceRecognitionStatus,
            insights: this._generateHealthInsightsFromResults(record.faceScanResults)
        };
    }

    static _calculateVitalsSummaryFromArray(userData) {
        if (!userData || userData.length === 0) {
            return null;
        }

        try {
            let totalHeartRate = 0, totalSystolic = 0, totalDiastolic = 0;
            let totalSpO2 = 0, totalRespiratoryRate = 0, totalWellnessScore = 0;
            let validHeartRate = 0, validSystolic = 0, validDiastolic = 0;
            let validSpO2 = 0, validRespiratoryRate = 0, validWellnessScore = 0;

            let earliestScan = new Date(userData[0].createdAt);
            let latestScan = new Date(userData[0].createdAt);

            userData.forEach(record => {
                const vitals = record.faceScanResults?.results?.vitals?.data || {};
                const spo2Bp = record.faceScanResults?.results?.spo2_bp?.data || {};
                const scanDate = new Date(record.createdAt);

                if (scanDate < earliestScan) earliestScan = scanDate;
                if (scanDate > latestScan) latestScan = scanDate;

                if (vitals.heart_rate) {
                    totalHeartRate += vitals.heart_rate;
                    validHeartRate++;
                }

                if (spo2Bp.bp_systolic) {
                    totalSystolic += spo2Bp.bp_systolic;
                    validSystolic++;
                }

                if (spo2Bp.bp_diastolic) {
                    totalDiastolic += spo2Bp.bp_diastolic;
                    validDiastolic++;
                }

                if (spo2Bp.spo2) {
                    totalSpO2 += spo2Bp.spo2;
                    validSpO2++;
                }

                if (vitals.respiratory_rate) {
                    totalRespiratoryRate += vitals.respiratory_rate;
                    validRespiratoryRate++;
                }

                const wellnessScore = this._calculateWellnessScoreFromResults(record.faceScanResults);
                if (wellnessScore) {
                    totalWellnessScore += wellnessScore;
                    validWellnessScore++;
                }
            });

            return {
                totalScans: userData.length,
                dateRange: {
                    earliest: earliestScan,
                    latest: latestScan
                },
                averages: {
                    heartRate: validHeartRate > 0 ? this._roundTo2(totalHeartRate / validHeartRate) : null,
                    bloodPressure: {
                        systolic: validSystolic > 0 ? this._roundTo2(totalSystolic / validSystolic) : null,
                        diastolic: validDiastolic > 0 ? this._roundTo2(totalDiastolic / validDiastolic) : null
                    },
                    oxygenSaturation: validSpO2 > 0 ? this._roundTo2(totalSpO2 / validSpO2) : null,
                    respiratoryRate: validRespiratoryRate > 0 ? this._roundTo2(totalRespiratoryRate / validRespiratoryRate) : null,
                    wellnessScore: validWellnessScore > 0 ? this._roundTo2(totalWellnessScore / validWellnessScore) : null
                }
            };
        } catch (error) {
            return null;
        }
    }

    static _calculateOverallConfidence(record) {
        const confidences = [
            record.aafma_confidence,
            record.cholesterol_confidence,
            record.diabetes_confidence
        ].filter(c => c !== null && c !== undefined);
        
        return confidences.length > 0 ? 
            this._roundTo2(confidences.reduce((sum, c) => sum + c, 0) / confidences.length) : null;
    }

    static _generateHealthInsights(record) {
        const insights = [];
        
        // Heart rate insights
        if (record.heart_rate) {
            if (record.heart_rate > 100) {
                insights.push({
                    type: 'warning',
                    category: 'cardiovascular',
                    message: 'Elevated heart rate detected. Consider rest and hydration.'
                });
            } else if (record.heart_rate < 60) {
                insights.push({
                    type: 'info',
                    category: 'cardiovascular',
                    message: 'Low heart rate may indicate good fitness or require medical attention.'
                });
            }
        }
        
        // Blood pressure insights
        if (record.bp_systolic > 130 || record.bp_diastolic > 80) {
            insights.push({
                type: 'warning',
                category: 'cardiovascular',
                message: 'Blood pressure is elevated. Monitor regularly and consult healthcare provider.'
            });
        }
        
        // SpO2 insights
        if (record.spo2 && record.spo2 < 95) {
            insights.push({
                type: 'alert',
                category: 'respiratory',
                message: 'Low oxygen saturation detected. Seek medical attention if persistent.'
            });
        }
        
        // Wellness score insights
        const wellnessScore = this._calculateWellnessScore(record);
        if (wellnessScore >= 80) {
            insights.push({
                type: 'positive',
                category: 'overall',
                message: 'Excellent wellness score! Keep maintaining your healthy lifestyle.'
            });
        } else if (wellnessScore < 60) {
            insights.push({
                type: 'improvement',
                category: 'overall',
                message: 'Consider lifestyle improvements for better health outcomes.'
            });
        }
        
        return insights;
    }
}

module.exports = FaceScanVitalService;