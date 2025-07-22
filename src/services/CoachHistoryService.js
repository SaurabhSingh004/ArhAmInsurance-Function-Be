const CoachHistory = require('../models/coachHistory');
const mongoose = require('mongoose');
const { logError } = require('../utils/logError');

class CoachHistoryService {
    static async getUserInteractions(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        try {
            const interactions = await CoachHistory.find(
                { userId },
                { _id: 1, messages: 1 }
            );

            if (!interactions || interactions.length === 0) {
                return [];
            }

            return interactions.map(interaction => {
                const messages = interaction.messages || [];
                const lastMessage = messages[messages.length - 1] || {};

                return {
                    interactionId: interaction._id,
                    title: lastMessage.content || 'No content'
                };
            });
        } catch (error) {
            throw logError('getUserInteractions', error, { userId });
        }
    }

    static async getInteractionById(interactionId, userId) {
        if (!interactionId || !userId) {
            throw new Error('Interaction ID and User ID are required');
        }

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(interactionId) ||
            !mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid interaction ID or user ID');
        }

        try {
            const interaction = await CoachHistory.findOne({
                _id: interactionId,
                userId: userId
            });

            if (!interaction) {
                throw new Error('Interaction not found or unauthorized');
            }

            return interaction;
        } catch (error) {
            throw logError('getInteractionById', error, { interactionId, userId });
        }
    }

    // Commenting out the aggregation method as it was commented in original
    // but if you want to keep it, here's how it would look:
    /*
    static async getUserInteractionsAggregation(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        try {
            const interactions = await CoachHistory.aggregate([
                {
                    $match: {
                        userId: mongoose.Types.ObjectId(userId)
                    }
                },
                {
                    $project: {
                        interactionId: '$_id',
                        lastMessage: {
                            $arrayElemAt: ['$messages', -1]
                        }
                    }
                },
                {
                    $project: {
                        interactionId: 1,
                        title: '$lastMessage.content'
                    }
                }
            ]);

            if (!interactions || interactions.length === 0) {
                return [];
            }

            return interactions.map(interaction => ({
                interactionId: interaction.interactionId,
                title: interaction.title || 'No content'
            }));
        } catch (error) {
            throw logError('getUserInteractionsAggregation', error, { userId });
        }
    }
    */
}

module.exports = CoachHistoryService;