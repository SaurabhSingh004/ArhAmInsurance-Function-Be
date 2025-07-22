
const extractJSONFromResponse = (response) => {
    try {
        // If it's already an object, return it
        if (typeof response === 'object' && response !== null) {
            return response;
        }

        // If it's a string, try to extract JSON
        if (typeof response === 'string') {
            // Remove markdown code block syntax if present
            const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                // Extract content between ```json and ```
                return JSON.parse(jsonMatch[1]);
            }

            // If no markdown, try parsing the string directly
            try {
                return JSON.parse(response);
            } catch (e) {
                // If direct parsing fails, try to find any JSON object in the string
                const possibleJson = response.match(/\{[\s\S]*\}/);
                if (possibleJson) {
                    return JSON.parse(possibleJson[0]);
                }
                throw new Error('No valid JSON found in response');
            }
        }

        throw new Error('Invalid response format');
    } catch (error) {
        console.error('Error extracting JSON:', error);
        throw new Error('Failed to extract JSON from response');
    }
};

const parseGPTResponse = (gptResponse) => {
    try {
        // Extract JSON from the GPT response
        const parsedResponse = extractJSONFromResponse(gptResponse);

        // Extract risk assessment data
        const riskAssessment = {
            riskScore: parsedResponse.riskScore,
            riskScoreTitle: parsedResponse.riskLevel,
            riskScoreType: parsedResponse.riskType
        };

        // Format symptoms tracking data
        const symptomsTracking = parsedResponse.symptomsToTrack.map(symptom => ({
            key: symptom.name,
            value: false,
        }));

        // Format recommendations
        const recommendations = {
            diet: parsedResponse.recommendations.diet,
            activity: parsedResponse.recommendations.activity,
            medication: parsedResponse.recommendations.medication,
            lifestyle: parsedResponse.recommendations.lifestyle,
            medicalAdvice: parsedResponse.recommendations.medicalAdvice
        };

        // Combine into final structure
        return {
            riskAssessment,
            symptomsTracking,
            recommendations,
            last_calculation: new Date()
        };
    } catch (error) {
        console.error('Error parsing GPT response:', error);
        throw new Error(`Failed to parse GPT response: ${error.message}`);
    }
};

module.exports = {
    parseGPTResponse
};
