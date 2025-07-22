const MedicalCondition = require('../models/medicalConditions');
const { logError } = require('../utils/logError');

class MedicalConditionService {
    async addConditions( conditions) {
        try {
            // First, validate all conditions
            conditions.forEach(this.validateCondition);

            // Process each condition and prepare for insertion
            const conditionsToInsert = conditions.map(condition => ({
                ...condition,
                diagnosedDate: condition.diagnosedDate ? new Date(condition.diagnosedDate) : undefined,
                isActive: true
            }));

            // Insert all conditions as separate documents
            const result = await MedicalCondition.insertMany(conditionsToInsert);
            return result;
        } catch (error) {
            logError('MedicalConditionService.addConditions', error);
            throw error;
        }
    }

    validateCondition(condition) {
        if (!condition.name || !condition.type) {
            throw new Error("Each condition must have 'name' and 'type'");
        }

        const validTypes = [
            'Diabetes',
            'Hypertension',
            'Thyroid',
            'PCOS/PCOD',
            'Heart Disease',
            'Joint Pain',
            'Mental Health (Anxiety/Stress)',
            'Digestive Issues',
            'Other'
        ];

        if (!validTypes.includes(condition.type)) {
            throw new Error(`Invalid condition type. Must be one of: ${validTypes.join(', ')}`);
        }
    }

    async getMedicalConditions() {
        try {
            return await MedicalCondition.find();
        } catch (error) {
            logError('MedicalConditionService.getMedicalConditions', error);
            throw error;
        }
    }

    async updateCondition(conditionId, updates) {
        try {
            const result = await MedicalCondition.findOneAndUpdate(
                {
                    _id: conditionId,
                    
                },
                {
                    $set: {
                        ...updates,
                        diagnosedDate: updates.diagnosedDate ? new Date(updates.diagnosedDate) : undefined
                    }
                },
                { new: true }
            );

            if (!result) {
                throw new Error('Medical condition not found');
            }

            return result;
        } catch (error) {
            logError('MedicalConditionService.updateCondition', error);
            throw error;
        }
    }

    async deleteCondition( conditionId) {
        try {
            // Soft delete by setting isActive to false
            const result = await MedicalCondition.findOneAndUpdate(
                {
                    _id: conditionId,
                    
                },
                {
                    $set: { isActive: false }
                },
                { new: true }
            );

            if (!result) {
                throw new Error('Medical condition not found');
            }

            return result;
        } catch (error) {
            logError('MedicalConditionService.deleteCondition', error);
            throw error;
        }
    }

    async getActiveConditions(userId) {
        try {
            return await MedicalCondition.find({
                userId,
                isActive: true
            });
        } catch (error) {
            logError('MedicalConditionService.getActiveConditions', error);
            throw error;
        }
    }

    async getConditionsByType(userId, type) {
        try {
            return await MedicalCondition.find({
                userId,
                type,
                isActive: true
            });
        } catch (error) {
            logError('MedicalConditionService.getConditionsByType', error);
            throw error;
        }
    }
}

module.exports = new MedicalConditionService();