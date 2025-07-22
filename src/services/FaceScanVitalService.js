const {logError} = require('../utils/logError');
const faceScanVitalDataModel = require('../models/faceScanVital');
const StreakService = require('../services/StreakService');
const FitnessDataService = require('../services/FitnessDataService')
class FaceScanVitalService {
    static async addFaceScanVitalData(data, userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const faceScanVitalData = new faceScanVitalDataModel({
                userId: userId,
                ibi: data.ibi,
                rmssd: data.rmssd,
                sdnn: data.sdnn,
                bpm: data.bpm,
                rr: data.rr,
                oxygen: data.oxygen,
                stressStatus: data.stressStatus,
                bloodPressureStatus: data.bloodPressureStatus,
                systolic: data.systolic,
                diastolic: data.diastolic,
                bmi: data.bmi,
                co: data.co,
                pnn50: data.pnn50,
                hu: data.hu,
                map: data.map,
                asth_risk: data.asth_risk
            });
            
            const savedData = await faceScanVitalData.save();
            await FitnessDataService.addHeartRateData(userId, savedData.bpm);
            await StreakService.syncFaceScanStreakData(userId, Date.now());
            if (!savedData) {
                throw new Error('Failed to save face scan vital data');
            }

            return savedData;
        } catch (error) {
            throw logError('addFaceScanVitalData', error, {data});
        }
    }

    static async getAllFaceScanVitalData(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const data = await faceScanVitalDataModel.find({userId: userId.toString()}).sort({ createdAt: -1 });
            if (!data) {
                throw new Error('No records found');
            }

            return data.map(record => this._formatFaceScanVitalData(record));
        } catch (error) {
            throw logError('getAllFaceScanVitalData', error, {userId});
        }
    }

    static async getLatestFaceScanVitalData(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            const data = await faceScanVitalDataModel.findOne({
                userId: userId.toString()
            }).sort({ createdAt: -1 });

            if (!data) {
                return null;
            }

            return this._formatFaceScanVitalData(data);
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

            return this._formatFaceScanVitalData(data);
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
            // Create start and end date for the given date
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            const data = await faceScanVitalDataModel.find({
                userId: userId.toString(),
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            }).sort({ createdAt: -1 });

            if (!data || data.length === 0) {
                throw new Error('No records found for the specified date');
            }

            return data.map(record => this._formatFaceScanVitalData(record));
        } catch (error) {
            throw logError('getFaceScanVitalsByDate', error, { userId, date });
        }
    }

    static _formatFaceScanVitalData(data) {
        return {
            _id: data._id,
            userId: data.userId,
            ibi: data.ibi,
            rmssd: data.rmssd,
            sdnn: data.sdnn,
            bpm: data.bpm,
            rr: data.rr,
            oxygen: data.oxygen,
            stressStatus: data.stressStatus,
            bloodPressureStatus: data.bloodPressureStatus,
            systolic: data.systolic,
            diastolic: data.diastolic,
            wellnessScore: this._calculateWellnessScore(
                data.diastolic,
                data.systolic,
                data.rmssd,
                data.bpm,
                data.rr,
                data.oxygen
            ),
            bmi: data.bmi,
            co: data.co,
            pnn50: data.pnn50,
            hu: data.hu,
            map: data.map,
            asth_risk: data.asth_risk,
            createdAt: data.createdAt,
            __v: data.__v
        };
    }

    static _calculateWellnessScore(diastolic, systolic, rmssd, heart_rate, breathing_rate, blood_oxygen) {
        const normalize = (value, min_val, max_val) => {
            return (value - min_val) / (max_val - min_val);
        };

        const parameters = [
            normalize(diastolic, 60, 80),
            normalize(systolic, 90, 120),
            normalize(rmssd, 20, 50),
            normalize(heart_rate, 60, 100),
            normalize(breathing_rate, 12, 20),
            normalize(blood_oxygen, 94, 100),
        ];

        const wellness_score = (parameters.reduce((sum, value) => sum + value, 0) / parameters.length) * 100;
        return Math.abs(wellness_score.toFixed(2));
    }
}

module.exports = FaceScanVitalService;