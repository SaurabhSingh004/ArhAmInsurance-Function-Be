const MedicineSchedule = require('../models/medicineSchedule');
const Medicine = require('../models/medicine');
const medicines = require('../utils/data/medicines');
const { logError } = require('../utils/logError');

class MedicineService {
    async addMedicine(userId, medicines) {
        try {
            const processedMedicines = this.processMedicines(medicines);
            const existingSchedule = await MedicineSchedule.findOne({ userId });

            if (existingSchedule) {
                existingSchedule.medicines.push(...processedMedicines);
                await existingSchedule.save();
                return existingSchedule;
            }

            const newSchedule = new MedicineSchedule({
                userId,
                medicines: processedMedicines
            });
            await newSchedule.save();
            return newSchedule;
        } catch (error) {
            logError('MedicineService.addMedicine', error);
            throw error;
        }
    }

    async seedMedicines() {
        try {
            const result = await Medicine.insertMany(medicines);
            return result;
        } catch (error) {
            logError('MedicineService.seedMedicines', error);
            throw error;
        }
    }

    async searchMedicines(searchParams) {
        try {
            const { query, page = 1, limit = 10 } = searchParams;
    
            if (!query) {
                throw new Error("Search query is required");
            }
    
            const skip = (page - 1) * limit;
    
            const searchCriteria = {
                isActive: true,
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    { instructions: { $regex: query, $options: 'i' } }
                ]
            };
    
            // Execute both queries in parallel
            const [total, medicines] = await Promise.all([
                Medicine.countDocuments(searchCriteria),
                Medicine.find(searchCriteria)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .sort({ name: 1 })
            ]);
    
            const totalPages = Math.ceil(total / limit);
    
            return {
                medicines,
                pagination: {
                    total,
                    page: parseInt(page),
                    totalPages,
                    hasMore: page < totalPages,
                    limit: parseInt(limit)
                }
            };
        } catch (error) {
            logError('MedicineService.searchMedicines', error);
            throw error;
        }
    }

    processMedicines(medicines) {
        return medicines.map(medicine => {
            const { name, description, dosage, frequency, times, duration } = medicine;

            this.validateMedicineFields(name, frequency, times, duration);
            this.validateFrequency(frequency);
            this.validateTimes(times);
            this.validateDuration(duration);

            const { startDate, endDate } = this.parseDurationDates(duration);
            const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

            const taken = Array(daysDiff).fill({
                morning_taken: false,
                afternoon_taken: false,
                dinner_taken: false
            });

            return {
                name,
                description: description || "",
                dosage: dosage || "",
                frequency,
                times: {
                    morning: Boolean(times.morning),
                    afternoon: Boolean(times.afternoon),
                    dinner: Boolean(times.dinner)
                },
                taken,
                duration: {
                    startDate,
                    endDate
                }
            };
        });
    }

    validateMedicineFields(name, frequency, times, duration) {
        if (!name || !frequency || !times || !duration) {
            throw new Error("Each medicine must have 'name', 'frequency', 'times', and 'duration'.");
        }
    }

    validateFrequency(frequency) {
        if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
            throw new Error("Invalid frequency. Allowed values: 'daily', 'weekly', 'monthly'.");
        }
    }

    validateTimes(times) {
        if (!times || typeof times !== 'object' || 
            (times.morning === undefined && 
             times.afternoon === undefined && 
             times.dinner === undefined)) {
            throw new Error("'times' must be an object with 'morning', 'afternoon', or 'dinner' boolean values.");
        }
    }

    validateDuration(duration) {
        if (!duration.startDate || !duration.endDate) {
            throw new Error("'duration' must have 'startDate' and 'endDate'.");
        }
    }

    parseDurationDates(duration) {
        const startDate = new Date(duration.startDate);
        const endDate = new Date(duration.endDate);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
            throw new Error("Invalid 'startDate' or 'endDate'. Start date should be earlier than end date.");
        }

        return { startDate, endDate };
    }

    async getMedicineSchedule(userId, date) {
        try {
            const targetDate = this.validateAndParseDate(date);
            const schedules = await this.findScheduleForDate(userId, targetDate);
            const { morning, afternoon, dinner } = this.processSchedulesByTimeSlot(schedules, targetDate);
            
            return this.formatScheduleData({
                userId,
                date: targetDate.toISOString().split('T')[0],
                schedule: {
                    morning: this.createTimeSlotData(morning),
                    afternoon: this.createTimeSlotData(afternoon),
                    dinner: this.createTimeSlotData(dinner)
                },
                totalMedicines: morning.length + afternoon.length + dinner.length,
                totalTaken: [...morning, ...afternoon, ...dinner].filter(med => med.isTaken).length
            });
        } catch (error) {
            logError('MedicineService.getMedicineSchedule', error);
            throw error;
        }
    }

    async updateMedicineStatus(userId, medicineId, date, timeSlot, isTaken) {
        try {
            const targetDate = this.validateAndParseDate(date);
            await this.validateUpdateRequest(userId, medicineId, timeSlot);
            
            const schedule = await this.findScheduleWithMedicine(userId, medicineId);
            const medicine = schedule.medicines.find(m => m._id.toString() === medicineId);
            
            const daysDifference = this.calculateDaysDifference(targetDate, medicine);
            this.validateScheduleFrequency(medicine, targetDate, daysDifference);

            const result = await this.updateTakenStatus(userId, medicineId, daysDifference, timeSlot, isTaken);
            
            if (result.modifiedCount === 0) {
                throw new Error("Failed to update medicine taken status.");
            }

            return {
                userId,
                medicineId,
                date: targetDate.toISOString().split('T')[0],
                timeSlot,
                isTaken: Boolean(isTaken)
            };
        } catch (error) {
            logError('MedicineService.updateMedicineStatus', error);
            throw error;
        }
    }

    // Helper methods for getMedicineSchedule
    validateAndParseDate(date) {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            throw new Error("Invalid date format.");
        }
        const targetDate = new Date(
            parsedDate.getFullYear(), 
            parsedDate.getMonth(), 
            parsedDate.getDate(), 
            0, 0, 0, 0
        );
        return targetDate;
    }

    async findScheduleForDate(userId, targetDate) {
        // Ensure the targetDate is set to the start of the day
        const startOfDay = targetDate;
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = startOfDay.setHours(23, 59, 59, 999);
        
        // Find schedules where the target date falls within any medicine's duration
        const schedule = await MedicineSchedule.findOne({
            userId,
            medicines: {
                $elemMatch: {
                    'duration.startDate': { $lte: startOfDay },
                    'duration.endDate': { $gte: endOfDay }
                }
            }
        }).lean();  // Using lean() for better performance since we don't need Mongoose instances

        if (!schedule) return null;

        // Filter medicines for the specific date based on frequency
        const filteredMedicines = schedule.medicines.filter(medicine => {
            const startDate = new Date(medicine.duration.startDate);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(medicine.duration.endDate);
            endDate.setHours(0, 0, 0, 0);

            // Check if the date falls within the duration
            if (startOfDay < startDate || startOfDay > endDate) {
                return false;
            }

            // Calculate days difference
            const daysDifference = Math.floor(
                (startOfDay - startDate) / (1000 * 60 * 60 * 24)
            );

            // Check frequency conditions
            switch(medicine.frequency) {
                case 'daily':
                    return true;
                case 'weekly':
                    return daysDifference % 7 === 0;
                case 'monthly':
                    // Check if the day of the month matches
                    return startOfDay.getDate() === startDate.getDate();
                default:
                    return false;
            }
        });

        // Return the schedule with filtered medicines
        return {
            ...schedule,
            medicines: filteredMedicines
        };
    }

    processSchedulesByTimeSlot(schedules, targetDate) {
        const timeSlots = { morning: [], afternoon: [], dinner: [] };
        
        if (!schedules) return timeSlots;

        schedules.medicines.forEach(medicine => {
            const { isScheduled, daysDifference } = this.checkMedicineScheduling(medicine, targetDate);
            
            if (isScheduled) {
                const takenStatus = medicine.taken[daysDifference] || {
                    morning_taken: false,
                    afternoon_taken: false,
                    dinner_taken: false
                };

                this.addMedicineToTimeSlots(medicine, takenStatus, timeSlots);
            }
        });

        return timeSlots;
    }

    checkMedicineScheduling(medicine, targetDate) {
        const startDate = new Date(medicine.duration.startDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(medicine.duration.endDate);
        endDate.setHours(0, 0, 0, 0);

        if (targetDate < startDate || targetDate > endDate) {
            return { isScheduled: false };
        }

        const daysDifference = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24));
        const isScheduled = this.isScheduledForDate(medicine, targetDate, startDate, daysDifference);

        return { isScheduled, daysDifference };
    }

    isScheduledForDate(medicine, targetDate, startDate, daysDifference) {
        switch(medicine.frequency) {
            case "daily":
                return true;
            case "weekly":
                return daysDifference % 7 === 0;
            case "monthly":
                const monthsDifference = 
                    targetDate.getMonth() - startDate.getMonth() +
                    12 * (targetDate.getFullYear() - startDate.getFullYear());
                return monthsDifference % 1 === 0 && targetDate.getDate() === startDate.getDate();
            default:
                return false;
        }
    }

    addMedicineToTimeSlots(medicine, takenStatus, timeSlots) {
        const createMedicineObject = (takenKey) => ({
            _id: medicine._id,
            name: medicine.name,
            description: medicine.description,
            dosage: medicine.dosage,
            frequency: medicine.frequency,
            isTaken: takenStatus[takenKey]
        });

        if (medicine.times.morning) {
            timeSlots.morning.push(createMedicineObject('morning_taken'));
        }
        if (medicine.times.afternoon) {
            timeSlots.afternoon.push(createMedicineObject('afternoon_taken'));
        }
        if (medicine.times.dinner) {
            timeSlots.dinner.push(createMedicineObject('dinner_taken'));
        }
    }

    createTimeSlotData(medicines) {
        return {
            count: medicines.length,
            medicines,
            totalTaken: medicines.filter(med => med.isTaken).length
        };
    }

    formatScheduleData(data) {
        return {
            userId: data.userId,
            date: data.date,
            morningCount: data.schedule.morning.count,
            afternoonCount: data.schedule.afternoon.count,
            dinnerCount: data.schedule.dinner.count,
            morning: data.schedule.morning.medicines.map(this.formatMedicineData),
            afternoon: data.schedule.afternoon.medicines.map(this.formatMedicineData),
            dinner: data.schedule.dinner.medicines.map(this.formatMedicineData),
        };
    }

    formatMedicineData(med) {
        return {
            _id: med._id,
            name: med.name,
            dosage: med.dosage,
            description: med.description,
            isTaken: med.isTaken,
        };
    }

    // Helper methods for updateMedicineStatus
    async validateUpdateRequest(userId, medicineId, timeSlot) {
        if (!userId || !medicineId || !timeSlot) {
            throw new Error("userId, medicineId, and timeSlot are required fields.");
        }

        if (!['morning', 'afternoon', 'dinner'].includes(timeSlot)) {
            throw new Error("timeSlot must be one of: morning, afternoon, dinner");
        }
    }

    async findScheduleWithMedicine(userId, medicineId) {
        const schedule = await MedicineSchedule.findOne({
            userId,
            "medicines._id": medicineId
        });

        if (!schedule) {
            throw new Error("Medicine schedule not found.");
        }

        return schedule;
    }

    calculateDaysDifference(targetDate, medicine) {
        const startDate = new Date(medicine.duration.startDate);
        startDate.setHours(0, 0, 0, 0);
        
        const daysDifference = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24));
        
        if (daysDifference < 0 || daysDifference >= medicine.taken.length) {
            throw new Error("Date is outside the medicine schedule duration.");
        }

        return daysDifference;
    }

    validateScheduleFrequency(medicine, targetDate, daysDifference) {
        const startDate = new Date(medicine.duration.startDate);
        let isScheduled = false;

        if (medicine.frequency === "daily") {
            isScheduled = true;
        } else if (medicine.frequency === "weekly") {
            isScheduled = daysDifference % 7 === 0;
        } else if (medicine.frequency === "monthly") {
            const monthsDifference = 
                targetDate.getMonth() - startDate.getMonth() +
                12 * (targetDate.getFullYear() - startDate.getFullYear());
            isScheduled = monthsDifference % 1 === 0 && 
                         targetDate.getDate() === startDate.getDate();
        }

        if (!isScheduled) {
            throw new Error("Medicine is not scheduled for this date based on frequency.");
        }
    }

    async updateTakenStatus(userId, medicineId, daysDifference, timeSlot, isTaken) {
        const updateField = `medicines.$.taken.${daysDifference}.${timeSlot}_taken`;
        
        return await MedicineSchedule.updateOne(
            {
                userId,
                "medicines._id": medicineId
            },
            {
                $set: {
                    [updateField]: Boolean(isTaken)
                }
            }
        );
    }

    async createMedicine(medicineData) {
        try {
            const medicine = new Medicine(medicineData);
            return await medicine.save();
        } catch (error) {
            logError('MedicineService.createMedicine', error);
            throw error;
        }
    }

    async getAllMedicines() {
        try {
            return await Medicine.find({ isActive: true })
                .sort({ createdAt: -1 });
        } catch (error) {
            logError('MedicineService.getAllMedicines', error);
            throw error;
        }
    }

    async getMedicineById(id) {
        try {
            const medicine = await Medicine.findById(id);
            if (!medicine) {
                throw new Error('Medicine not found');
            }
            return medicine;
        } catch (error) {
            logError('MedicineService.getMedicineById', error);
            throw error;
        }
    }

    async updateMedicine(id, updateData) {
        try {
            const medicine = await Medicine.findByIdAndUpdate(
                id,
                { 
                    ...updateData,
                    updatedAt: new Date()
                },
                { new: true, runValidators: true }
            );

            if (!medicine) {
                throw new Error('Medicine not found');
            }

            return medicine;
        } catch (error) {
            logError('MedicineService.updateMedicine', error);
            throw error;
        }
    }

    async deleteMedicine(id) {
        try {
            const medicine = await Medicine.findByIdAndDelete(id);
            
            if (!medicine) {
                throw new Error('Medicine not found');
            }

            return medicine;
        } catch (error) {
            logError('MedicineService.deleteMedicine', error);
            throw error;
        }
    }
}

module.exports = new MedicineService();