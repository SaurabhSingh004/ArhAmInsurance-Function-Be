const DiseaseRiskPrediction = require('../models/diseaseRiskPrediction');
const AIService = require('../services/AIService');
const { diseaseData } = require('../utils/data/diseaseData');
const { parseGPTResponse } = require('../utils/diseaseRiskResponseParser');
const mongoose = require('mongoose');

class DiseaseRiskPredictionService {

    static async createPrediction({ userId, condition, promptData }) {
        try {
            const promptDataPayload = {
                messages: [
                  {
                    role: "user",
                    content: promptData
                  }
                ]
              };
            // Get GPT response
            const gptResponse = await AIService.getAIResponse(promptDataPayload);
            
            const riskAssessment = parseGPTResponse(gptResponse);

            console.log(riskAssessment);

            // Map symptoms from diseaseData
            const symptoms = riskAssessment.symptomsTracking;

            // Create new prediction entry
            const prediction = new DiseaseRiskPrediction({
                userId,
                diseaseName: condition.title,
                diseaseId: condition.id,
                riskScoreTitle: riskAssessment.riskAssessment.riskScoreTitle,
                riskScore: riskAssessment.riskAssessment.riskScore,
                riskScoreType: riskAssessment.riskAssessment.riskScoreType,
                symptonsTracking: symptoms,
                planOfAction: riskAssessment.recommendations,
            });

            await prediction.save();

            return {
                prediction
            };

        } catch (error) {
            console.error('Error in createPrediction:', error);
            throw error;
        }
    }
    static async getDiseaseRiskSummary(riskId) {
      try {
        const summary = await DiseaseRiskPrediction.findById(riskId);
        return summary;
      } catch (error) {
        throw error;
      }
    }
    /**
   * Fetches a summary of unique disease risk predictions,
   * returning one entry per unique diseaseId and diseaseName,
   * along with a representative riskScore.
   */
    static async getUniqueDiseaseRiskSummary(userId) {
      try {
        const summary = await DiseaseRiskPrediction.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(userId)
            }
          },
          {
            $sort: {
              createdAt: -1 // Sort by creation date in descending order (newest first)
            }
          },
          {
            $group: {
              _id: { diseaseId: "$diseaseId", diseaseName: "$diseaseName" },
              riskScore: { $first: "$riskScore" },
              riskScoreType: { $first: "$riskScoreType" },
              schemaId: { $first: "$_id" },
              createdAt: { $first: "$createdAt" } // Keep track of when this entry was created
            }
          },
          {
            $project: {
              _id: 0,
              schemaId: 1,
              diseaseId: "$_id.diseaseId",
              diseaseName: "$_id.diseaseName",
              riskScore: 1,
              riskScoreType: 1,
              createdAt: 1 // Include creation date in the output
            }
          }
        ]);
        
        return summary;
      } catch (error) {
        throw error;
      }
    }

  /**
   * Updates a single symptom's tracking value for a given prediction.
   * @param {String} predictionId - The ID of the DiseaseRiskPrediction document.
   * @param {String} symptomKey - The key/name of the symptom to update.
   * @param {Boolean} newValue - The new boolean value for the symptom.
   */
  static async updateSymptom(predictionId, symptomKey, newValue) {
    try {
      // Find the document by its ID
      const prediction = await DiseaseRiskPrediction.findById(predictionId);
      if (!prediction) {
        throw new Error('Disease Risk Prediction not found');
      }

      // Find the index of the symptom in the symptonsTracking array
      const symptomIndex = prediction.symptonsTracking.findIndex(symptom => symptom.key === symptomKey);
      if (symptomIndex === -1) {
        throw new Error('Symptom not found');
      }

      // Update the value
      prediction.symptonsTracking[symptomIndex].value = newValue;

      // Save the updated document
      await prediction.save();
      return prediction;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = DiseaseRiskPredictionService;