const axios = require('axios');
const { logError } = require('../utils/logError');
const azureToken = require('./../config/app.config');

class AIService {
    static async getAIResponse(promptBody) {
        if (!promptBody) {
            throw new Error('Prompt body is required');
        }

        // Validate required environment variables
        if (!azureToken.AZURE_ENDPOINT || !azureToken.AZURE_API_KEY ||
            !azureToken.AZURE_DEPLOYMENT_NAME || !azureToken.AZURE_API_VERSION) {
            throw new Error('Required environment variables are not set');
        }

        try {
            const response = await axios.post(
                `${azureToken.AZURE_ENDPOINT}/openai/deployments/${azureToken.AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=${azureToken.AZURE_API_VERSION}`,
                promptBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': azureToken.AZURE_API_KEY
                    }
                }
            );

            if (!response.data?.choices?.[0]?.message?.content) {
                throw new Error('Invalid response format from AI service');
            }

            return response.data.choices[0].message.content;
        } catch (error) {
            throw logError('getAIResponse', error, { promptBody });
        }
    }
}

module.exports = AIService;