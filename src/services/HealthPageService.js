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
            const [faceScanVitals, bloodTestReport, cgmData, waterData] = await Promise.all([
                FaceScanService.getLatestFaceScanVitalData(user._id),
                BloodTestReportService.getLatestTestReport(user._id),
                CGMService.getDateRangeGlucoseReadings(user._id, Date.now(), Date.now()),
            ]);
            console.log(faceScanVitals, "...",bloodTestReport, cgmData);
            const vitalsData = faceScanVitals != null ? {
                heartRate: faceScanVitals?.bpm || 0,
                respiratoryRate: faceScanVitals?.rr || 0,
                oxygenSaturation: faceScanVitals?.oxygen || 0,
                stressLevel: faceScanVitals?.stressStatus || 'NA',
                bloodPressure: {
                    status: faceScanVitals?.bloodPressureStatus || 'NA',
                    systolic: faceScanVitals?.systolic || 0,
                    diastolic: faceScanVitals?.diastolic || 0
                },
                wellnessScore: faceScanVitals?.wellnessScore || 0
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
            const [faceScanVitals, bloodTestReport, cgmData, mealIntakeData,userData, wellnessData] = await Promise.all([
                FaceScanService.getLatestFaceScanVitalData(user._id),
                BloodTestReportService.getLatestTestReport(user._id),
                CGMService.getDateRangeGlucoseReadings(user._id, Date.now(), Date.now()),
                MealService.getDailyMeals(user._id, Date.now()),
                UserServices.getProfile(user._id),
                WellnessService.getUserWellnessScore(user._id)
            ]);
            const latestFitnessData = await FitnessData.findOne({ userId:user?._id }, {}, { sort: { date: -1 } }).select('-_id -userId -__v -metadata');
            

            // Format and return the combined response
            return {
                vitals: {
                    heartRate: faceScanVitals?.bpm || 0,
                    respiratoryRate: faceScanVitals?.rr || 0,
                    oxygenSaturation: faceScanVitals?.oxygen || 0,
                    stressLevel: faceScanVitals?.stressStatus || 'NA',
                    bloodPressure: {
                        status: faceScanVitals?.bloodPressureStatus || 'NA',
                        systolic: faceScanVitals?.systolic || 0,
                        diastolic: faceScanVitals?.diastolic || 0
                    },
                    wellnessScore: faceScanVitals?.wellnessScore || 0
                },
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
            throw logError('getHealthData', error, {user});
        }
    }
}

module.exports = HealthPageService;