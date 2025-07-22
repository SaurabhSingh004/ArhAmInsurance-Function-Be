const diseaseData = {
    cardiovascular: {
      name: "Cardiovascular Disease",
      symptoms: [
        { name: "Chest Pain/Discomfort", enabled: false },
        { name: "Shortness of Breath", enabled: false },
        { name: "High Blood Pressure (>130/80)", enabled: false },
        { name: "Elevated Resting Heart Rate", enabled: false },
        { name: "Dizziness", enabled: false },
        { name: "Fatigue", enabled: false },
        { name: "Swelling in Legs/Ankles", enabled: false }
      ],
      vitals: [
        { name: "Blood Pressure Reading", enabled: false },
        { name: "Heart Rate", enabled: false },
        { name: "Cholesterol Levels", enabled: false }
      ]
    },
    diabetes: {
      name: "Diabetes",
      symptoms: [
        { name: "Frequent Thirst", enabled: false },
        { name: "Frequent Urination", enabled: false },
        { name: "Fatigue", enabled: false },
        { name: "Blurry Vision", enabled: false },
        { name: "Slow Wound Healing", enabled: false },
        { name: "Unexplained Weight Changes", enabled: false }
      ],
      vitals: [
        { name: "Blood Glucose Level", enabled: false },
        { name: "HbA1c Reading", enabled: false },
        { name: "Weight/BMI", enabled: false }
      ]
    },
    thyroid: {
      name: "Thyroid Disorders",
      symptoms: [
        { name: "Unexplained Weight Changes", enabled: false },
        { name: "Fatigue/Energy Changes", enabled: false },
        { name: "Neck Swelling/Pain", enabled: false },
        { name: "Dry Skin", enabled: false },
        { name: "Hair Loss", enabled: false },
        { name: "Mood Changes", enabled: false }
      ],
      vitals: [
        { name: "TSH Level", enabled: false },
        { name: "T3 Level", enabled: false },
        { name: "T4 Level", enabled: false }
      ]
    },
    pcos: {
      name: "PCOS/PCOD",
      symptoms: [
        { name: "Irregular Periods", enabled: false },
        { name: "Excessive Hair Growth", enabled: false },
        { name: "Acne", enabled: false },
        { name: "Weight Management Issues", enabled: false },
        { name: "Mood Swings", enabled: false },
        { name: "Fatigue", enabled: false }
      ],
      vitals: [
        { name: "Blood Sugar Level", enabled: false },
        { name: "Weight/BMI", enabled: false },
        { name: "Menstrual Cycle Tracking", enabled: false }
      ]
    },
    joints: {
      name: "Joint Pain/Arthritis",
      symptoms: [
        { name: "Morning Joint Stiffness", enabled: false },
        { name: "Joint Pain During Movement", enabled: false },
        { name: "Joint Swelling", enabled: false },
        { name: "Reduced Range of Motion", enabled: false },
        { name: "Warmth Around Joints", enabled: false }
      ],
      vitals: [
        { name: "Pain Level (1-10)", enabled: false },
        { name: "CRP Level", enabled: false },
        { name: "Weight/BMI", enabled: false }
      ]
    },
    mentalHealth: {
      name: "Mental Health",
      symptoms: [
        { name: "Anxiety Levels", enabled: false },
        { name: "Stress Level", enabled: false },
        { name: "Sleep Issues", enabled: false },
        { name: "Fatigue", enabled: false },
        { name: "Irritability", enabled: false },
        { name: "Concentration Issues", enabled: false }
      ],
      vitals: [
        { name: "Sleep Hours", enabled: false },
        { name: "Resting Heart Rate", enabled: false },
        { name: "Daily Mood Score", enabled: false }
      ]
    },
    digestive: {
      name: "Digestive Issues",
      symptoms: [
        { name: "Bloating", enabled: false },
        { name: "Acidity/Heartburn", enabled: false },
        { name: "Constipation", enabled: false },
        { name: "Diarrhea", enabled: false },
        { name: "Abdominal Pain", enabled: false },
        { name: "Nausea", enabled: false }
      ],
      vitals: [
        { name: "Water Intake", enabled: false },
        { name: "Fiber Intake", enabled: false },
        { name: "Bowel Movement Frequency", enabled: false }
      ]
    }
  };
  
  module.exports = diseaseData;
  