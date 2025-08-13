const {logError} = require('../utils/logError');
const FaceScanService = require('../services/FaceScanVitalService');
const BloodTestReportService = require('../services/BloodtestReportService');
const CGMService = require('../services/CgmService');
const FitnessData = require('../models/FitnessData');
const MealService = require('../services/FoodService/MealService');
const UserServices = require('../services/UserService');
const WellnessService = require('../services/WellnessService');

class HealthPageService {
    static async getHealthData(user) {
        if (!user?._id) {
            throw new Error('User ID is required');
        }

        try {
            // Fetch data from all required services
            const [faceScanVitals, bloodTestReport, cgmData] = await Promise.all([
                FaceScanService.getLatestFaceScanVitalData(user._id),
                BloodTestReportService.getLatestTestReport(user._id),
                CGMService.getDateRangeGlucoseReadings(user._id, Date.now(), Date.now()),
            ]);
            
            console.log(faceScanVitals, "...", bloodTestReport, cgmData);
            
            // Format vitals data using new field structure
            const vitalsData = faceScanVitals != null ? {
                heartRate: faceScanVitals?.heart_rate || 0,
                respiratoryRate: faceScanVitals?.respiratory_rate || 0,
                oxygenSaturation: faceScanVitals?.spo2 || 0,
                bloodPressure: {
                    systolic: faceScanVitals?.bp_systolic || 0,
                    diastolic: faceScanVitals?.bp_diastolic || 0
                },
                wellnessScore: faceScanVitals?.wellnessScore || 0,
                // Advanced health predictions
                cardiovascularRisk: faceScanVitals?.overall_cardiovascular_risk || 0,
                aafmaCategory: faceScanVitals?.aafma_category || 'Unknown',
                cholesterolCategory: faceScanVitals?.cholesterol_category || 'Unknown',
                diabetesCategory: faceScanVitals?.diabetes_category || 'Unknown'
            } : {};

            // Format and return the combined response
            return {
                vitals: vitalsData,
                bloodTest: bloodTestReport,
                glucose: {
                    cgmData
                },
                weight: {
                    current: user?.weight || 0,
                    unit: 'kg'
                }
            };
        } catch (error) {
            console.log(error);
            throw logError('getHealthData', error, {user});
        }
    }

    static async getHealthInsightData(user) {
        if (!user?._id) {
            throw new Error('User ID is required');
        }

        try {
            // Fetch data from all required services
            const [faceScanVitals, bloodTestReport, cgmData, mealIntakeData, userData, wellnessData] = await Promise.all([
                FaceScanService.getLatestFaceScanVitalData(user._id),
                BloodTestReportService.getLatestTestReport(user._id),
                CGMService.getDateRangeGlucoseReadings(user._id, Date.now(), Date.now()),
                MealService.getDailyMeals(user._id, Date.now()),
                UserServices.getProfile(user._id),
                WellnessService.getUserWellnessScore(user._id)
            ]);
            
            const latestFitnessData = await FitnessData.findOne({ userId: user?._id }, {}, { sort: { date: -1 } }).select('-_id -userId -__v -metadata');
            
            // Format vitals data using new field structure with comprehensive health insights
            const vitalsData = faceScanVitals != null ? {
                // Basic vitals
                heartRate: faceScanVitals?.heart_rate || 0,
                respiratoryRate: faceScanVitals?.respiratory_rate || 0,
                oxygenSaturation: faceScanVitals?.spo2 || 0,
                bloodPressure: {
                    systolic: faceScanVitals?.bp_systolic || 0,
                    diastolic: faceScanVitals?.bp_diastolic || 0
                },
                wellnessScore: faceScanVitals?.wellnessScore || 0,
                
                // Advanced health predictions
                cardiovascularRisk: faceScanVitals?.overall_cardiovascular_risk || 0,
                aafmaRisk: {
                    category: faceScanVitals?.aafma_category || 'Unknown',
                    probability: faceScanVitals?.aafma_probability || 0,
                    confidence: faceScanVitals?.aafma_confidence || 0
                },
                cholesterol: {
                    level: faceScanVitals?.cholesterol_level || 0,
                    category: faceScanVitals?.cholesterol_category || 'Unknown',
                    confidence: faceScanVitals?.cholesterol_confidence || 0
                },
                diabetes: {
                    category: faceScanVitals?.diabetes_category || 'Unknown',
                    risk: faceScanVitals?.diabetes_risk || 0,
                    hba1c_estimated: faceScanVitals?.hba1c_estimated || 0,
                    confidence: faceScanVitals?.diabetes_confidence || 0
                },
                
                // Scan metadata
                scanDate: faceScanVitals?.createdAt || null,
                scanStatus: faceScanVitals?.scan_status || 'unknown'
            } : {};

            // Format and return the comprehensive response
            return {
                vitals: vitalsData,
                bloodTest: bloodTestReport ? bloodTestReport : {},
                glucose: {
                    cgmData
                },
                weight: {
                    current: user?.weight || 0,
                    unit: 'kg'
                },
                fitnessData: latestFitnessData || {},
                meal: mealIntakeData,
                user: userData,
                wellness: wellnessData
            };
        } catch (error) {
            console.log(error);
            throw logError('getHealthInsightData', error, {user});
        }
    }

    // New method to get health risk assessment
    static async getHealthRiskAssessment(user) {
        if (!user?._id) {
            throw new Error('User ID is required');
        }

        try {
            const faceScanVitals = await FaceScanService.getLatestFaceScanVitalData(user._id);
            
            if (!faceScanVitals) {
                return {
                    riskAssessment: null,
                    message: 'No face scan data available for risk assessment'
                };
            }

            // Calculate overall risk level
            const cardiovascularRisk = faceScanVitals.overall_cardiovascular_risk || 0;
            let overallRiskLevel = 'Low';
            
            if (cardiovascularRisk >= 40) overallRiskLevel = 'Very High';
            else if (cardiovascularRisk >= 20) overallRiskLevel = 'High';
            else if (cardiovascularRisk >= 10) overallRiskLevel = 'Moderate';

            return {
                riskAssessment: {
                    overallRisk: {
                        level: overallRiskLevel,
                        score: cardiovascularRisk
                    },
                    aafma: {
                        category: faceScanVitals.aafma_category,
                        risk: faceScanVitals.aafma_risk,
                        confidence: faceScanVitals.aafma_confidence
                    },
                    diabetes: {
                        category: faceScanVitals.diabetes_category,
                        risk: faceScanVitals.diabetes_risk,
                        hba1c: faceScanVitals.hba1c_estimated
                    },
                    cholesterol: {
                        level: faceScanVitals.cholesterol_level,
                        category: faceScanVitals.cholesterol_category
                    },
                    vitals: {
                        heartRate: faceScanVitals.heart_rate,
                        bloodPressure: {
                            systolic: faceScanVitals.bp_systolic,
                            diastolic: faceScanVitals.bp_diastolic
                        },
                        spo2: faceScanVitals.spo2
                    }
                },
                lastAssessment: faceScanVitals.createdAt
            };
        } catch (error) {
            throw logError('getHealthRiskAssessment', error, {user});
        }
    }

    // Method to get health trends over time
    static async getHealthTrends(user, days = 30) {
        if (!user?._id) {
            throw new Error('User ID is required');
        }

        try {
            const vitalTrends = await FaceScanService.getVitalTrends(user._id, days);
            
            return {
                trends: vitalTrends,
                period: `${days} days`,
                totalScans: vitalTrends.length
            };
        } catch (error) {
            throw logError('getHealthTrends', error, {user, days});
        }
    }
}

module.exports = HealthPageService;