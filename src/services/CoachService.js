const AIService = require('../services/AIService');
const {getCoachPromptData, getLogData} = require('../utils/prompts/coachPrompt');
const MealService = require('../services/FoodService/MealService');
const HealthPageService = require('../services/HealthPageService');
const CoachHistory = require('../models/coachHistory');
const mongoose = require('mongoose');
const StreakService = require('./StreakService');
// const WorkoutPlan = require('./WorkoutPlanService');
// const DietPlanService = require('./DietPlanService');
const {logError} = require('../utils/logError');

class CoachService {
    static async getCoachResponse(reqBody, userId) {
        
        const {token, prompt, interaction_id} = reqBody;

        // Validate required fields
        if (!prompt || !userId) {
            throw new Error('Prompt and user ID are required');
        }

        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        try {
            const messages = [{
                role: "user",
                content: prompt
            }];

            const chatHistory = (interaction_id === "0" || interaction_id === 0) ? false :
                await CoachHistory.findById(interaction_id);

            const contextHistory = chatHistory ? chatHistory.messages : "";

            const userHealthInsight = await HealthPageService.getHealthInsightData({_id: userId});

            const promptData = getCoachPromptData(
                prompt,
                token,
                JSON.stringify(userHealthInsight),
                JSON.stringify(contextHistory)
            );

            // await StreakService.syncCoachConnectStreakData(userId, Date.now());
            const response = await AIService.getAIResponse(promptData);
            return this.getParsedResponse(response, userId, messages, chatHistory, prompt);
        } catch (error) {
            throw logError('getCoachResponse', error, {userId: userId});
        }
    }

    static async getParsedResponse(response, userId, messages, chatHistory, prompt) {
        if (!response || !userId || !messages) {
            throw new Error('Required parameters missing for parsing response');
        }

        try {
            // let jsonString = response.replace(/```json\n|\n```/g, '');
            let jsonString = response.replace(/```json\n|\n```/g, '')
                .replace(/[\n\r\t]/g, '')
                .trim();
            const parsedContent = JSON.parse(jsonString)
            let {model, data, time} = parsedContent;

            switch (model) {
                case 1:
                    await MealService.addAndUpdateMeal(userId, data.meal, data.meal_type, 1);
                    data = "Your meal has been added successfully";
                    break;

                case 2:
                    await HealthInsightService.updateHealthInsights(userId, Date.now(), data);
                    data = "Your data has been added successfully";
                    break;

                case 3:
                    const mealRes = await MealService.getDateMeals(userId, new Date(time));
                    const mealLogPrompt = getLogData(prompt, 100, JSON.stringify(mealRes));
                    data = await AIService.getAIResponse(mealLogPrompt);
                    break;

                // case 4:
                //     const workoutRes = await WorkoutPlan.getWorkoutPlanByDate(userId, time);
                //     const logPrompt = getLogData(prompt, 100, JSON.stringify(workoutRes));
                //     data = await AIService.getAIResponse(logPrompt);
                //     break;
            }

            messages.push({
                role: "system",
                content: data
            });

            const interactionId = await this.saveChatHistory(chatHistory, messages, userId);

            return {data, interactionId};
        } catch (error) {
            throw logError('getParsedResponse', error, {userId: userId});
        }
    }

    static async saveChatHistory(chatHistory, messages, userId) {
        if (!messages || !userId) {
            throw new Error('Messages and user ID are required');
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        try {
            if (chatHistory) {
                chatHistory.messages.push(...messages);
                const updated = await chatHistory.save();
                return updated._id;
            }

            const newChatHistory = new CoachHistory({
                messages,
                userId
            });

            const created = await newChatHistory.save();
            return created._id;
        } catch (error) {
            throw logError('saveChatHistory', error, {userId});
        }
    }
}

module.exports = CoachService;
