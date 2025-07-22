const diseaseData = require('../data/diseaseData');

const generateRiskAssessmentPrompt = (condition, answers) => {
  // Retrieve disease-specific data from the object using the condition id.
  const diseaseSymptoms = diseaseData[condition.id]?.symptoms || [];
  const diseaseVitals = diseaseData[condition.id]?.vitals || [];

  // Build each section of the prompt.
  const patientResponses = Object.entries(answers)
    .map(([id, value]) => {
      const question = condition.questions.find(q => q.id === id);
      return `- ${question.text}: ${value ? 'Yes' : 'No'}`;
    })
    .join('\n');

  const keyMetrics = condition.metrics.map(metric => `- ${metric}`).join('\n');
  const vitalsList = diseaseVitals.map(vital => `- ${vital.name}`).join('\n');
  const symptomsList = diseaseSymptoms.map(symptom => `- ${symptom.name}`).join('\n');
  const riskLevelsList = condition.riskLevels
    .map(level => `- Score ${level.range[0]}-${level.range[1]}: ${level.description}`)
    .join('\n');

  // Define the JSON format snippet for the expected output.
  const jsonFormatSnippet = `{
  "riskScore": <number between 0-100>,
  "riskLevel": "<description based on score range>",
  "riskType": "<Healthy|Mild|Moderate|High|Critical>",
  "recommendations": {
    "diet": "<specific dietary recommendations>",
    "activity": "<specific activity recommendations>",
    "medication": "<medication recommendations if applicable>",
    "lifestyle": "<lifestyle modification recommendations>",
    "medicalAdvice": "<specific medical follow-up recommendations>"
  },
  "symptomsToTrack": [
    {
      "name": "<symptom name from the disease data>",
      "priority": "<High|Medium|Low>",
      "trackingFrequency": "<Daily|Weekly|Monthly>",
      "alertThreshold": "<description of when to seek medical attention>"
    }
  ]
}`;

  // Construct the complete prompt.
  return `You are a medical risk assessment system. Analyze the following patient data for ${condition.title}:

1. PATIENT RESPONSES:
${patientResponses}

2. KEY HEALTH METRICS TO CONSIDER:
${keyMetrics}

3. AVAILABLE VITAL SIGNS FOR MONITORING:
${vitalsList}

4. SYMPTOMS TO TRACK:
${symptomsList}

Based on these inputs, provide a comprehensive risk assessment following these risk levels:
${riskLevelsList}

TREATMENT PLAN CONSIDERATIONS:
- Diet: ${condition.planOfAction.diet}
- Activity: ${condition.planOfAction.activity}
- Medication: ${condition.planOfAction.medication}
- Lifestyle: ${condition.planOfAction.lifestyle}
- Medical Advice: ${condition.planOfAction.medicalAdvice}

Provide your assessment in the following JSON format:
${jsonFormatSnippet}

Note: The response should prioritize tracking symptoms that are most relevant to the patient's specific risk level and responses. Include specific thresholds and frequencies for monitoring each symptom and vital sign.`;
};

module.exports = {
  generateRiskAssessmentPrompt
};
