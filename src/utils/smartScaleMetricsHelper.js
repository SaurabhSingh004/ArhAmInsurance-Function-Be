const Long = require('mongodb').Long;



exports.fnBodyComposition = (data) => new Promise((resolve, reject) => {
    try {
        
        var array = [];
        data.forEach((e) => {
            var user_data = {
                _id: e._id,
                userId: e.userId,
                timestamp: parseInt(e.timestamp),
                device_type: e.device_type,
                device_id: e.device_id,
                gender: e.gender,
                weight: e.weight,
                height: e.height,
                bmi: e.bmi,
                body_fat: e.body_fat,
                physique: e.physique,
                fat_free_weight: e.fat_free_weight,
                subcutaneous_fat: e.subcutaneous_fat,
                visceral_fat: e.visceral_fat,
                body_water: e.body_water,
                skeletal_muscle: e.skeletal_muscle,
                muscle_mass: e.muscle_mass,
                bone_mass: e.bone_mass,
                protein: e.protein,
                bmr: e.bmr,
                metabolic_age: e.metabolic_age,
                health_score: e.health_score,
                is_athlete: e.is_athlete,
                right_arm_fat: e.right_arm_fat,
                right_arm_fat_kg: e.right_arm_fat_kg,
                right_arm_muscle_mass: e.right_arm_muscle_mass,
                right_arm_muscle_mass_kg: e.right_arm_muscle_mass_kg,
                left_arm_fat: e.left_arm_fat,
                left_arm_fat_kg: e.left_arm_fat_kg,
                left_arm_muscle_mass: e.left_arm_muscle_mass,
                left_arm_muscle_mass_kg: e.left_arm_muscle_mass_kg,
                right_leg_fat: e.right_leg_fat,
                right_leg_fat_kg: e.right_leg_fat_kg,
                right_leg_muscle_mass: e.right_leg_muscle_mass,
                right_leg_muscle_mass_kg: e.right_leg_muscle_mass_kg,
                left_leg_fat: e.left_leg_fat,
                left_leg_fat_kg: e.left_leg_fat_kg,
                left_leg_muscle_mass: e.left_leg_muscle_mass,
                left_leg_muscle_mass_kg: e.left_leg_muscle_mass_kg,
                trunk_fat: e.trunk_fat,
                trunk_fat_kg: e.trunk_fat_kg,
                trunk_muscle_mass: e.trunk_muscle_mass,
                trunk_muscle_mass_kg: e.trunk_muscle_mass_kg,
                createdAt: e.createdAt,
                updatedAt: e.updatedAt
            }
            array.push(user_data)
        })
        return resolve(array)
    } catch (err) {
        
        return reject(err)
    }
})

exports.generateSmartScaleNudges = (data) => new Promise((resolve, reject) => {
    try{
        const nudges = [];

        const weightCur = data.weight;
        const bmiCur = data.bmi;
        const bodyFatCur = data.body_fat;

        // Weight
        

        // Calculate standard values for other parameters
        const bmiStandard = 22;        // Example standard value for BMI
        const bodyFatStandard = 20;    // Example standard value for Body Fat Percentage
        const weightStandard = 85;

        // Generate nudges for each parameter
        if (weightCur > weightStandard) {
            const msg = 'Check your Weight, follow emergency protocols if necessary, and contact your healthcare provider for further guidance.'
            nudges.push({ nudge: "Your weight is very high", value: Number(weightCur.toFixed(0)), unit: "kg", msg:msg, plancode:"conditionalPlan" });
        }
        if (bmiCur > bmiStandard) {
            const msg = 'Check your BMI, follow emergency protocols if necessary, and contact your healthcare provider for further guidance.'
            nudges.push({ nudge: "Your BMI is above the standard value", value: Number(bmiCur.toFixed(0)), unit: "", msg:msg, plancode:"conditionalPlan",msg:msg, plancode:"conditionalPlan" });
        }
        if (bodyFatCur > bodyFatStandard) {
            const msg = 'Check your Fat Percentage, follow emergency protocols if necessary, and contact your healthcare provider for further guidance.'
            nudges.push({ nudge: "Your body fat percentage is above the standard value", value: Number(bodyFatCur.toFixed(0)), unit: "%", msg:msg, plancode:"conditionalPlan" });
        }

        return resolve(nudges)
    }
    catch (err) {
    
        return reject(err)
    }
})


exports.calRiskScore = (gender,bodyFat,BMI,bodyWater,bodyWeight, boneMass,height, muscleVolume, BP,hr,hrv,spo2,rr) => new Promise((resolve, reject) =>{
    try{
        let cardiacRiskScore = 0,
        kidneyRiskScore = 0,
        diabetesRiskScore = 0,
        neurologicalRiskScore = 0,
        cancerRiskScore = 0,
        copdRiskScore = 0,
        mentalRiskScore = 0,
        gastrointestinalRiskScore = 0,
        count = 0
  
    if(bodyFat){
          const score = calBodyFatScore(gender,bodyFat)
          cardiacRiskScore = cardiacRiskScore + score.cardiacRisk
          kidneyRiskScore = kidneyRiskScore + score.kidneyRisk
          diabetesRiskScore = diabetesRiskScore + score.diabetesRisk
          neurologicalRiskScore = neurologicalRiskScore + score.neurologicalRisk
          cancerRiskScore = cancerRiskScore + score.cancerRisk
          copdRiskScore = copdRiskScore + score.copdRisk
          mentalRiskScore = mentalRiskScore + score.mentalRisk
          gastrointestinalRiskScore = gastrointestinalRiskScore + score.gastrointestinalRisk
          count = count + 1
      }
    if(BMI){
          const score = calBMIScore(BMI)
          cardiacRiskScore = cardiacRiskScore + score.cardiacRisk
          kidneyRiskScore = kidneyRiskScore + score.kidneyRisk
          diabetesRiskScore = diabetesRiskScore + score.diabetesRisk
          neurologicalRiskScore = neurologicalRiskScore + score.neurologicalRisk
          cancerRiskScore = cancerRiskScore + score.cancerRisk
          copdRiskScore = copdRiskScore + score.copdRisk
          mentalRiskScore = mentalRiskScore + score.mentalRisk
          gastrointestinalRiskScore = gastrointestinalRiskScore + score.gastrointestinalRisk
          count = count + 1
    }  
    if(bodyWater){
          const score = calBodyWaterScore(gender,bodyWater)
          cardiacRiskScore = cardiacRiskScore + score.cardiacRisk
          kidneyRiskScore = kidneyRiskScore + score.kidneyRisk
          diabetesRiskScore = diabetesRiskScore + score.diabetesRisk
          neurologicalRiskScore = neurologicalRiskScore + score.neurologicalRisk
          cancerRiskScore = cancerRiskScore + score.cancerRisk
          copdRiskScore = copdRiskScore + score.copdRisk
          mentalRiskScore = mentalRiskScore + score.mentalRisk
          gastrointestinalRiskScore = gastrointestinalRiskScore + score.gastrointestinalRisk
          count = count + 1
    }
    if(bodyWeight && boneMass){
          const score = calBoneMassScore(gender, bodyWeight, boneMass)
          cardiacRiskScore = cardiacRiskScore + score.cardiacRisk
          kidneyRiskScore = kidneyRiskScore + score.kidneyRisk
          diabetesRiskScore = diabetesRiskScore + score.diabetesRisk
          neurologicalRiskScore = neurologicalRiskScore + score.neurologicalRisk
          cancerRiskScore = cancerRiskScore + score.cancerRisk
          copdRiskScore = copdRiskScore + score.copdRisk
          mentalRiskScore = mentalRiskScore + score.mentalRisk
          gastrointestinalRiskScore = gastrointestinalRiskScore + score.gastrointestinalRisk
          count = count + 1
    }
    if(height && muscleVolume){
      
          const score = calMuscleVolumeScore(gender, height, muscleVolume)
          cardiacRiskScore = cardiacRiskScore + score.cardiacRisk
          kidneyRiskScore = kidneyRiskScore + score.kidneyRisk
          diabetesRiskScore = diabetesRiskScore + score.diabetesRisk
          neurologicalRiskScore = neurologicalRiskScore + score.neurologicalRisk
          cancerRiskScore = cancerRiskScore + score.cancerRisk
          copdRiskScore = copdRiskScore + score.copdRisk
          mentalRiskScore = mentalRiskScore + score.mentalRisk
          gastrointestinalRiskScore = gastrointestinalRiskScore + score.gastrointestinalRisk
          count = count + 1
    }
    if(BP){
          const score = calBPScore(BP)
          cardiacRiskScore = cardiacRiskScore + score.cardiacRisk
          kidneyRiskScore = kidneyRiskScore + score.kidneyRisk
          diabetesRiskScore = diabetesRiskScore + score.diabetesRisk
          neurologicalRiskScore = neurologicalRiskScore + score.neurologicalRisk
          cancerRiskScore = cancerRiskScore + score.cancerRisk
          copdRiskScore = copdRiskScore + score.copdRisk
          mentalRiskScore = mentalRiskScore + score.mentalRisk
          gastrointestinalRiskScore = gastrointestinalRiskScore + score.gastrointestinalRisk
          count = count + 1
    }
    if(hr){
          const score = calHRScore(hr)
          cardiacRiskScore = cardiacRiskScore + score.cardiacRisk
          kidneyRiskScore = kidneyRiskScore + score.kidneyRisk
          diabetesRiskScore = diabetesRiskScore + score.diabetesRisk
          neurologicalRiskScore = neurologicalRiskScore + score.neurologicalRisk
          cancerRiskScore = cancerRiskScore + score.cancerRisk
          copdRiskScore = copdRiskScore + score.copdRisk
          mentalRiskScore = mentalRiskScore + score.mentalRisk
          gastrointestinalRiskScore = gastrointestinalRiskScore + score.gastrointestinalRisk
          count = count + 1
  
    }
    if(hrv){
          const score = calHRVScore(hrv)
          cardiacRiskScore = cardiacRiskScore + score.cardiacRisk
          kidneyRiskScore = kidneyRiskScore + score.kidneyRisk
          diabetesRiskScore = diabetesRiskScore + score.diabetesRisk
          neurologicalRiskScore = neurologicalRiskScore + score.neurologicalRisk
          cancerRiskScore = cancerRiskScore + score.cancerRisk
          copdRiskScore = copdRiskScore + score.copdRisk
          mentalRiskScore = mentalRiskScore + score.mentalRisk
          gastrointestinalRiskScore = gastrointestinalRiskScore + score.gastrointestinalRisk
          count = count + 1
    }
    if(spo2){
          const score = calSPO2Score(spo2)
          cardiacRiskScore = cardiacRiskScore + score.cardiacRisk
          kidneyRiskScore = kidneyRiskScore + score.kidneyRisk
          diabetesRiskScore = diabetesRiskScore + score.diabetesRisk
          neurologicalRiskScore = neurologicalRiskScore + score.neurologicalRisk
          cancerRiskScore = cancerRiskScore + score.cancerRisk
          copdRiskScore = copdRiskScore + score.copdRisk
          mentalRiskScore = mentalRiskScore + score.mentalRisk
          gastrointestinalRiskScore = gastrointestinalRiskScore + score.gastrointestinalRisk
          count = count + 1
    }
    if(rr){
          const score = calRRScore(rr)
          cardiacRiskScore = cardiacRiskScore + score.cardiacRisk
          kidneyRiskScore = kidneyRiskScore + score.kidneyRisk
          diabetesRiskScore = diabetesRiskScore + score.diabetesRisk
          neurologicalRiskScore = neurologicalRiskScore + score.neurologicalRisk
          cancerRiskScore = cancerRiskScore + score.cancerRisk
          copdRiskScore = copdRiskScore + score.copdRisk
          mentalRiskScore = mentalRiskScore + score.mentalRisk
          gastrointestinalRiskScore = gastrointestinalRiskScore + score.gastrointestinalRisk
          count = count + 1
    }
  
    const cardiacRiskScoreCal = Number((cardiacRiskScore/count).toFixed(1))
    const kidneyRiskScoreCal = Number((kidneyRiskScore/count).toFixed(1))  
    const diabetesRiskScoreCal = Number((diabetesRiskScore/count).toFixed(1))
    const neurologicalRiskScoreCal = Number((neurologicalRiskScore/count).toFixed(1))
    const cancerRiskScoreCal = Number((cancerRiskScore/count).toFixed(1))
    const copdRiskScoreCal = Number((copdRiskScore/count).toFixed(1))
    const mentalRiskScoreCal = Number((mentalRiskScore/count).toFixed(1))
    const gastrointestinalRiskScoreCal = Number((gastrointestinalRiskScore/count).toFixed(1))
    const totalRiskScoreCal = Number(((cardiacRiskScoreCal+kidneyRiskScoreCal+diabetesRiskScoreCal+neurologicalRiskScoreCal+cancerRiskScoreCal+copdRiskScoreCal+mentalRiskScoreCal+gastrointestinalRiskScoreCal)/8).toFixed(1))
    const welnessScoreCal = 100 - totalRiskScoreCal
    return resolve({
          cardiacRiskScore: cardiacRiskScoreCal,
          kidneyRiskScore: kidneyRiskScoreCal,
          diabetesRiskScore: diabetesRiskScoreCal,
          neurologicalRiskScore: neurologicalRiskScoreCal,
          cancerRiskScore: cancerRiskScoreCal,
          copdRiskScore: copdRiskScoreCal,
          mentalRiskScore: mentalRiskScoreCal,
          gastrointestinalRiskScore: gastrointestinalRiskScoreCal,
          totalRiskScore: totalRiskScoreCal,
          welnessScore: welnessScoreCal
         
      })
    }
    catch (err) {

        return reject(err)
    }
  })  

exports.fnAddBodyComposition = (userId, data) => new Promise((resolve, reject) => {
    try {
        var user_data = {
            userId: userId,
            timestamp: Long.fromNumber(data.timestamp),
            device_type: data.device_type,
            device_id: data.device_id,
            gender: data.gender,
            weight: data.weight,
            bmi: data.bmi,
            body_fat: data.body_fat,
            physique: data.physique,
            fat_free_weight: data.fat_free_weight,
            subcutaneous_fat: data.subcutaneous_fat,
            visceral_fat: data.visceral_fat,
            body_water: data.body_water,
            skeletal_muscle: data.skeletal_muscle,
            muscle_mass: data.muscle_mass,
            bone_mass: data.bone_mass,
            protein: data.protein,
            bmr: data.bmr,
            metabolic_age: data.metabolic_age,
            health_score: data.health_score,
            is_athlete: data.is_athlete
        }
        
        return resolve(user_data)
    } catch (err) {
        return reject(err);
    }
})

exports.fnAddSmartscaleProData = (data) => new Promise((resolve, reject) => {
    try {
        var user_data = {
            userId: data.userId,
            timestamp: Long.fromNumber(data.timestamp),
            device_type: data.device_type,
            device_id: data.device_id,
            weight: data.weight,
            bmi: data.bmi,
            body_fat: data.body_fat,
            fat_free_weight: data.fat_free_weight,
            subcutaneous_fat: data.subcutaneous_fat,
            visceral_fat: data.visceral_fat,
            body_water: data.body_water,
            skeletal_muscle: data.skeletal_muscle,
            muscle_mass: data.muscle_mass,
            bone_mass: data.bone_mass,
            protein: data.protein,
            bmr: data.bmr,
            metabolic_age: data.metabolic_age,
            right_arm_fat: data.right_arm_fat,
            right_arm_fat_kg: data.right_arm_fat_kg,
            right_arm_muscle_mass: data.right_arm_muscle_mass,
            right_arm_muscle_mass_kg: data.right_arm_muscle_mass_kg,
            left_arm_fat: data.left_arm_fat,
            left_arm_fat_kg: data.left_arm_fat_kg,
            left_arm_muscle_mass: data.left_arm_muscle_mass,
            left_arm_muscle_mass_kg: data.left_arm_muscle_mass_kg,
            right_leg_fat: data.right_leg_fat,
            right_leg_fat_kg: data.right_leg_fat_kg,
            right_leg_muscle_mass: data.right_leg_muscle_mass,
            right_leg_muscle_mass_kg: data.right_leg_muscle_mass_kg,
            left_leg_fat: data.left_leg_fat,
            left_leg_fat_kg: data.left_leg_fat_kg,
            left_leg_muscle_mass: data.left_leg_muscle_mass,
            left_leg_muscle_mass_kg: data.left_leg_muscle_mass_kg,
            trunk_fat: data.trunk_fat,
            trunk_fat_kg: data.trunk_fat_kg,
            trunk_muscle_mass: data.trunk_muscle_mass,
            trunk_muscle_mass_kg: data.trunk_muscle_mass_kg,
            is_athlete: data.is_athlete,
            health_score: data.health_score,
            physique: data.physique
        }
        return resolve(user_data)
    } catch (err) {
        ;
        return reject(err);
    }
})

exports.fnAddBodyCompositionByUuid = (data,user) => new Promise((resolve, reject) => {

    try {
        var user_data = {
            userId: user._id,
            timestamp: Long.fromNumber(data.timestamp),
            device_type: data.device_type,
            device_id: data.device_id,
            gender: data.gender,
            weight: data.weight,
            bmi: data.bmi,
            body_fat: data.body_fat,
            physique: data.physique,
            fat_free_weight: data.fat_free_weight,
            subcutaneous_fat: data.subcutaneous_fat,
            visceral_fat: data.visceral_fat,
            body_water: data.body_water,
            skeletal_muscle: data.skeletal_muscle,
            muscle_mass: data.muscle_mass,
            bone_mass: data.bone_mass,
            protein: data.protein,
            bmr: data.bmr,
            metabolic_age: data.metabolic_age,
            health_score: data.health_score,
            is_athlete: data.is_athlete
        }
        
        return resolve(user_data)
    } catch (err) {
        ;
        return reject(err);
    }
})

exports.fnAddSmartscaleProDataByUuid = (data, user) => new Promise((resolve, reject) => {
    try {
        var user_data = {
            userId: user._id,
            timestamp: Long.fromNumber(data.timestamp),
            device_type: data.device_type,
            device_id: data.device_id,
            weight: data.weight,
            bmi: data.bmi,
            body_fat: data.body_fat,
            fat_free_weight: data.fat_free_weight,
            subcutaneous_fat: data.subcutaneous_fat,
            visceral_fat: data.visceral_fat,
            body_water: data.body_water,
            skeletal_muscle: data.skeletal_muscle,
            muscle_mass: data.muscle_mass,
            bone_mass: data.bone_mass,
            protein: data.protein,
            bmr: data.bmr,
            metabolic_age: data.metabolic_age,
            right_arm_fat: data.right_arm_fat,
            right_arm_fat_kg: data.right_arm_fat_kg,
            right_arm_muscle_mass: data.right_arm_muscle_mass,
            right_arm_muscle_mass_kg: data.right_arm_muscle_mass_kg,
            left_arm_fat: data.left_arm_fat,
            left_arm_fat_kg: data.left_arm_fat_kg,
            left_arm_muscle_mass: data.left_arm_muscle_mass,
            left_arm_muscle_mass_kg: data.left_arm_muscle_mass_kg,
            right_leg_fat: data.right_leg_fat,
            right_leg_fat_kg: data.right_leg_fat_kg,
            right_leg_muscle_mass: data.right_leg_muscle_mass,
            right_leg_muscle_mass_kg: data.right_leg_muscle_mass_kg,
            left_leg_fat: data.left_leg_fat,
            left_leg_fat_kg: data.left_leg_fat_kg,
            left_leg_muscle_mass: data.left_leg_muscle_mass,
            left_leg_muscle_mass_kg: data.left_leg_muscle_mass_kg,
            trunk_fat: data.trunk_fat,
            trunk_fat_kg: data.trunk_fat_kg,
            trunk_muscle_mass: data.trunk_muscle_mass,
            trunk_muscle_mass_kg: data.trunk_muscle_mass_kg,
            is_athlete: data.is_athlete,
            health_score: data.health_score,
            physique: data.physique
        }
        
        return resolve(user_data)
    } catch (err) {
        ;
        return reject(err);
    }
})

// util methods

function calBodyFatScore(gender,bodyFat){
    if(gender == 'male'){
        if(bodyFat < 11){
           return  {
                cardiacRisk: 10,
                kidneyRisk: 30, 
                diabetesRisk: 8, 
                neurologicalRisk: 30, 
                cancerRisk: 25, 
                copdRisk: 14, 
                mentalRisk: 40, 
                gastrointestinalRisk: 13
            }
            //Low
        }else if(bodyFat < 22){
            return  {
                cardiacRisk: 5,
                kidneyRisk: 6, 
                diabetesRisk: 3, 
                neurologicalRisk: 2, 
                cancerRisk: 8, 
                copdRisk: 2, 
                mentalRisk: 4, 
                gastrointestinalRisk: 4
            }
            //standard
        }else if(bodyFat < 27){
            return  {
                cardiacRisk: 70,
                kidneyRisk: 50, 
                diabetesRisk: 75, 
                neurologicalRisk: 80, 
                cancerRisk: 77, 
                copdRisk: 80, 
                mentalRisk: 78, 
                gastrointestinalRisk: 80
            }
            //High
        }else{
            return  {
                cardiacRisk: 80,
                kidneyRisk: 85, 
                diabetesRisk: 90, 
                neurologicalRisk: 78, 
                cancerRisk: 89, 
                copdRisk: 88, 
                mentalRisk: 93, 
                gastrointestinalRisk: 96
            }
            //Seriously high
        }
    }else{
        if(bodyFat < 21){
            return  {
                cardiacRisk: 10,
                kidneyRisk: 30, 
                diabetesRisk: 8, 
                neurologicalRisk: 30, 
                cancerRisk: 25, 
                copdRisk: 14, 
                mentalRisk: 40, 
                gastrointestinalRisk: 13
            }
            //Low
        }else if(bodyFat < 31){
            return  {
                cardiacRisk: 5,
                kidneyRisk: 6, 
                diabetesRisk: 3, 
                neurologicalRisk: 2, 
                cancerRisk: 8, 
                copdRisk: 2, 
                mentalRisk: 4, 
                gastrointestinalRisk: 4
            }
            //standard
        }else if(bodyFat < 37){
            return  {
                cardiacRisk: 70,
                kidneyRisk: 50, 
                diabetesRisk: 75, 
                neurologicalRisk: 80, 
                cancerRisk: 77, 
                copdRisk: 80, 
                mentalRisk: 78, 
                gastrointestinalRisk: 80
            }
            //High
        }else{
            return  {
                cardiacRisk: 80,
                kidneyRisk: 85, 
                diabetesRisk: 90, 
                neurologicalRisk: 78, 
                cancerRisk: 89, 
                copdRisk: 88, 
                mentalRisk: 93, 
                gastrointestinalRisk: 96
            }
            //Seriously high
        }
    }
}
function calBMIScore(BMI){
    if(BMI < 18.5){
        return  {
            cardiacRisk: 12,
            kidneyRisk: 33, 
            diabetesRisk: 20, 
            neurologicalRisk: 35, 
            cancerRisk: 28, 
            copdRisk: 28, 
            mentalRisk: 44, 
            gastrointestinalRisk: 18
        }
        //LOW
    }else if(BMI < 26){
        return  {
            cardiacRisk: 3,
            kidneyRisk: 4, 
            diabetesRisk: 5, 
            neurologicalRisk: 7, 
            cancerRisk: 3, 
            copdRisk: 4, 
            mentalRisk: 5, 
            gastrointestinalRisk: 6
        }
        //Standard
    }else{
        return  {
            cardiacRisk: 82,
            kidneyRisk: 86, 
            diabetesRisk: 92, 
            neurologicalRisk: 75, 
            cancerRisk: 85, 
            copdRisk: 83, 
            mentalRisk: 92, 
            gastrointestinalRisk: 93
        }
        //HIGH
    }
}
function calBodyWaterScore(gender,bodyWater){
    if(gender == 'male'){
        if(bodyWater < 55){
            return  {
                cardiacRisk: 11,
                kidneyRisk: 23, 
                diabetesRisk: 30, 
                neurologicalRisk: 42, 
                cancerRisk: 35, 
                copdRisk: 27, 
                mentalRisk: 42, 
                gastrointestinalRisk: 16
            }
            //Low
        }else if(bodyWater < 65){
            return  {
                cardiacRisk: 4,
                kidneyRisk: 6, 
                diabetesRisk: 7, 
                neurologicalRisk: 10, 
                cancerRisk: 6, 
                copdRisk: 8, 
                mentalRisk: 12, 
                gastrointestinalRisk: 8
            }
            //standard
        }else{
            return  {
                cardiacRisk: 72,
                kidneyRisk: 76, 
                diabetesRisk: 83, 
                neurologicalRisk: 65, 
                cancerRisk: 73, 
                copdRisk: 72, 
                mentalRisk: 75, 
                gastrointestinalRisk: 84
            }
            //High
        }
    }else{
        if(bodyWater < 45){
            return  {
                cardiacRisk: 11,
                kidneyRisk: 23, 
                diabetesRisk: 30, 
                neurologicalRisk: 42, 
                cancerRisk: 35, 
                copdRisk: 27, 
                mentalRisk: 42, 
                gastrointestinalRisk: 16
            }
            //Low
        }else if(bodyWater < 60){
            return  {
                cardiacRisk: 4,
                kidneyRisk: 6, 
                diabetesRisk: 7, 
                neurologicalRisk: 10, 
                cancerRisk: 6, 
                copdRisk: 8, 
                mentalRisk: 12, 
                gastrointestinalRisk: 8
            }
            //standard
        }else{
            return  {
                cardiacRisk: 72,
                kidneyRisk: 76, 
                diabetesRisk: 83, 
                neurologicalRisk: 65, 
                cancerRisk: 73, 
                copdRisk: 72, 
                mentalRisk: 75, 
                gastrointestinalRisk: 84
            }
            //High
        }
    }
}
function calBoneMassScore(gender, bodyWeight, boneMass){
    if(gender == 'male'){
        if(bodyWeight < 60){
            if(boneMass < 2.3){
                return  {
                    cardiacRisk: 40,
                    kidneyRisk: 60, 
                    diabetesRisk: 35, 
                    neurologicalRisk: 64, 
                    cancerRisk: 65, 
                    copdRisk: 54, 
                    mentalRisk: 65, 
                    gastrointestinalRisk: 43
                }
                //Low
            }else if(boneMass < 2.7){
                return  {
                    cardiacRisk: 5,
                    kidneyRisk: 7, 
                    diabetesRisk: 8, 
                    neurologicalRisk: 12, 
                    cancerRisk: 13, 
                    copdRisk: 12, 
                    mentalRisk: 10, 
                    gastrointestinalRisk: 7
                }
                //standard
            }else{
                return  {
                    cardiacRisk: 84,
                    kidneyRisk: 88, 
                    diabetesRisk: 85, 
                    neurologicalRisk: 72, 
                    cancerRisk: 82, 
                    copdRisk: 85, 
                    mentalRisk: 85, 
                    gastrointestinalRisk: 89
                }
                //high
            }
        }else if(bodyWeight < 75){
            if(boneMass < 2.7){
                return  {
                    cardiacRisk: 50,
                    kidneyRisk: 70, 
                    diabetesRisk: 45, 
                    neurologicalRisk: 74, 
                    cancerRisk: 75, 
                    copdRisk: 64, 
                    mentalRisk: 75, 
                    gastrointestinalRisk: 53
                }
                //Low
            }else if(boneMass < 3.1){
                return  {
                    cardiacRisk: 8,
                    kidneyRisk: 10, 
                    diabetesRisk: 9, 
                    neurologicalRisk: 13, 
                    cancerRisk: 14, 
                    copdRisk: 14, 
                    mentalRisk: 12, 
                    gastrointestinalRisk: 11
                }
                //standard
            }else{
                return  {
                    cardiacRisk: 91,
                    kidneyRisk: 93, 
                    diabetesRisk: 94, 
                    neurologicalRisk: 92, 
                    cancerRisk: 96, 
                    copdRisk: 95, 
                    mentalRisk: 94, 
                    gastrointestinalRisk: 92
                }
                //high
            }
        }else{
            if(boneMass < 3){
                return  {
                    cardiacRisk: 60,
                    kidneyRisk: 75, 
                    diabetesRisk: 55, 
                    neurologicalRisk: 78, 
                    cancerRisk: 79, 
                    copdRisk: 69, 
                    mentalRisk: 79, 
                    gastrointestinalRisk: 57
                }
                //Low
            }else if(boneMass < 3.4){
                return  {
                    cardiacRisk: 12,
                    kidneyRisk: 13, 
                    diabetesRisk: 12, 
                    neurologicalRisk: 15, 
                    cancerRisk: 19, 
                    copdRisk: 18, 
                    mentalRisk: 16, 
                    gastrointestinalRisk: 14
                }
                //standard
            }else{
                return  {
                    cardiacRisk: 93,
                    kidneyRisk: 95, 
                    diabetesRisk: 96, 
                    neurologicalRisk: 95, 
                    cancerRisk: 94, 
                    copdRisk: 93, 
                    mentalRisk: 95, 
                    gastrointestinalRisk: 91
                }
                //high
            }
        }
    }else{
        if(bodyWeight < 45){
            if(boneMass < 1.6){
                return  {
                    cardiacRisk: 55,
                    kidneyRisk: 68, 
                    diabetesRisk: 43, 
                    neurologicalRisk: 64, 
                    cancerRisk: 72, 
                    copdRisk: 63, 
                    mentalRisk: 73, 
                    gastrointestinalRisk: 53
                }
                //Low
            }else if(boneMass < 2){
                return  {
                    cardiacRisk: 9,
                    kidneyRisk: 7, 
                    diabetesRisk: 8, 
                    neurologicalRisk: 8, 
                    cancerRisk: 15, 
                    copdRisk: 13, 
                    mentalRisk: 15, 
                    gastrointestinalRisk: 12
                }
                //standard
            }else{
                return  {
                    cardiacRisk: 91,
                    kidneyRisk: 90, 
                    diabetesRisk: 89, 
                    neurologicalRisk: 87, 
                    cancerRisk: 89, 
                    copdRisk: 91, 
                    mentalRisk: 92, 
                    gastrointestinalRisk: 91
                }
                //high
            }
        }else if(bodyWeight < 60){
            if(boneMass < 2){
                return  {
                    cardiacRisk: 59,
                    kidneyRisk: 72, 
                    diabetesRisk: 52, 
                    neurologicalRisk: 71, 
                    cancerRisk: 79, 
                    copdRisk: 72, 
                    mentalRisk: 78, 
                    gastrointestinalRisk: 68
                }
                //Low
            }else if(boneMass < 2.4){
                return  {
                    cardiacRisk: 12,
                    kidneyRisk: 9, 
                    diabetesRisk: 13, 
                    neurologicalRisk: 14, 
                    cancerRisk: 12, 
                    copdRisk: 11, 
                    mentalRisk: 13, 
                    gastrointestinalRisk: 15
                }
                //standard
            }else{
                return  {
                    cardiacRisk: 93,
                    kidneyRisk: 92, 
                    diabetesRisk: 91, 
                    neurologicalRisk: 89, 
                    cancerRisk: 92, 
                    copdRisk: 94, 
                    mentalRisk: 94, 
                    gastrointestinalRisk: 93
                }
                //high
            }
        }else{
            if(boneMass < 2.3){
                return  {
                    cardiacRisk: 64,
                    kidneyRisk: 74, 
                    diabetesRisk: 56, 
                    neurologicalRisk: 77, 
                    cancerRisk: 73, 
                    copdRisk: 79, 
                    mentalRisk: 83, 
                    gastrointestinalRisk: 72
                }
                //Low
            }else if(boneMass < 2.7){
                return  {
                    cardiacRisk: 14,
                    kidneyRisk: 12, 
                    diabetesRisk: 15, 
                    neurologicalRisk: 18, 
                    cancerRisk: 17, 
                    copdRisk: 16, 
                    mentalRisk: 18, 
                    gastrointestinalRisk: 21
                }
                //standard
            }else{
                return  {
                    cardiacRisk: 96,
                    kidneyRisk: 95, 
                    diabetesRisk: 94, 
                    neurologicalRisk: 93, 
                    cancerRisk: 95, 
                    copdRisk: 97, 
                    mentalRisk: 95, 
                    gastrointestinalRisk: 96
                }
                //high
            }   
        }
    }
}
function calMuscleVolumeScore(gender, height, muscleVolume){
    if(gender == 'male'){
        if(height < 160){
            if(muscleVolume < 38.5){
                return  {
                    cardiacRisk: 79,
                    kidneyRisk: 74, 
                    diabetesRisk: 79, 
                    neurologicalRisk: 74, 
                    cancerRisk: 73, 
                    copdRisk: 71, 
                    mentalRisk: 73, 
                    gastrointestinalRisk: 74
                }
                //Low
            }else if(muscleVolume < 46.5){
                return  {
                    cardiacRisk: 29,
                    kidneyRisk: 14, 
                    diabetesRisk: 12, 
                    neurologicalRisk: 13, 
                    cancerRisk: 13, 
                    copdRisk: 12, 
                    mentalRisk: 13, 
                    gastrointestinalRisk: 17
                }
                //standard
            }else{
                return  {
                    cardiacRisk: 89,
                    kidneyRisk: 85, 
                    diabetesRisk: 85, 
                    neurologicalRisk: 83, 
                    cancerRisk: 84, 
                    copdRisk: 83, 
                    mentalRisk: 84, 
                    gastrointestinalRisk: 85
                }
                //high
            }
        }else if(height < 170){
            if(muscleVolume < 44){
                return  {
                    cardiacRisk: 74,
                    kidneyRisk: 75, 
                    diabetesRisk: 76, 
                    neurologicalRisk: 73, 
                    cancerRisk: 76, 
                    copdRisk: 78, 
                    mentalRisk: 75, 
                    gastrointestinalRisk: 72
                }
                //Low
            }else if(muscleVolume < 52.4){
                return  {
                    cardiacRisk: 17,
                    kidneyRisk: 13, 
                    diabetesRisk: 15, 
                    neurologicalRisk: 17, 
                    cancerRisk: 19, 
                    copdRisk: 14, 
                    mentalRisk: 12, 
                    gastrointestinalRisk: 19
                }
                //standard
            }else{
                return  {
                    cardiacRisk: 93,
                    kidneyRisk: 84, 
                    diabetesRisk: 83, 
                    neurologicalRisk: 84, 
                    cancerRisk: 83, 
                    copdRisk: 86, 
                    mentalRisk: 88, 
                    gastrointestinalRisk: 89
                }
                //high
            }
        }else{
            if(muscleVolume < 49.4){
                return  {
                    cardiacRisk: 81,
                    kidneyRisk: 80, 
                    diabetesRisk: 75, 
                    neurologicalRisk: 76, 
                    cancerRisk: 77, 
                    copdRisk: 79, 
                    mentalRisk: 74, 
                    gastrointestinalRisk: 79
                }
                //Low
            }else if(muscleVolume < 59.4){
                return  {
                    cardiacRisk: 19,
                    kidneyRisk: 13, 
                    diabetesRisk: 15, 
                    neurologicalRisk: 16, 
                    cancerRisk: 17, 
                    copdRisk: 19, 
                    mentalRisk: 14, 
                    gastrointestinalRisk: 19
                }
                //standard
            }else{
                return  {
                    cardiacRisk: 92,
                    kidneyRisk: 83, 
                    diabetesRisk: 85, 
                    neurologicalRisk: 86, 
                    cancerRisk: 85, 
                    copdRisk: 84, 
                    mentalRisk: 82, 
                    gastrointestinalRisk: 85
                }
                //high
            }
        }
    }else{
        if(height < 150){
            if(muscleVolume < 29.1){
                return  {
                    cardiacRisk: 75,
                    kidneyRisk: 75, 
                    diabetesRisk: 73, 
                    neurologicalRisk: 77, 
                    cancerRisk: 75, 
                    copdRisk: 73, 
                    mentalRisk: 76, 
                    gastrointestinalRisk: 78
                }
                //Low
            }else if(muscleVolume < 34.7){
                return  {
                    cardiacRisk: 23,
                    kidneyRisk: 24, 
                    diabetesRisk: 22, 
                    neurologicalRisk: 24, 
                    cancerRisk: 25, 
                    copdRisk: 24, 
                    mentalRisk: 18, 
                    gastrointestinalRisk: 19
                }
                //standard
            }else{
                return  {
                    cardiacRisk: 85,
                    kidneyRisk: 89, 
                    diabetesRisk: 84, 
                    neurologicalRisk: 89, 
                    cancerRisk: 86, 
                    copdRisk: 87, 
                    mentalRisk: 89, 
                    gastrointestinalRisk: 90
                }
                //high
            }
        }else if(height < 160){
            if(muscleVolume < 32.9){
                return  {
                    cardiacRisk: 72,
                    kidneyRisk: 74, 
                    diabetesRisk: 77, 
                    neurologicalRisk: 73, 
                    cancerRisk: 72, 
                    copdRisk: 78, 
                    mentalRisk: 79, 
                    gastrointestinalRisk: 73
                }
                //Low
            }else if(muscleVolume < 37.5){
                return  {
                    cardiacRisk: 19,
                    kidneyRisk: 15, 
                    diabetesRisk: 16, 
                    neurologicalRisk: 12, 
                    cancerRisk: 16, 
                    copdRisk: 17, 
                    mentalRisk: 14, 
                    gastrointestinalRisk: 19
                }
                //standard
            }else{
                return  {
                    cardiacRisk: 92,
                    kidneyRisk: 92, 
                    diabetesRisk: 93, 
                    neurologicalRisk: 94, 
                    cancerRisk: 93, 
                    copdRisk: 91, 
                    mentalRisk: 92, 
                    gastrointestinalRisk: 91
                }
                //high
            }
        }else{
            if(muscleVolume < 36.5){
                return  {
                    cardiacRisk: 77,
                    kidneyRisk: 78, 
                    diabetesRisk: 75, 
                    neurologicalRisk: 77, 
                    cancerRisk: 74, 
                    copdRisk: 76, 
                    mentalRisk: 74, 
                    gastrointestinalRisk: 78
                }
                //Low
            }else if(muscleVolume < 42.5){
                return  {
                    cardiacRisk: 19,
                    kidneyRisk: 16, 
                    diabetesRisk: 17, 
                    neurologicalRisk: 14, 
                    cancerRisk: 16, 
                    copdRisk: 18, 
                    mentalRisk: 14, 
                    gastrointestinalRisk: 14
                }
                //standard
            }else{
                return  {
                    cardiacRisk: 91,
                    kidneyRisk: 81, 
                    diabetesRisk: 84, 
                    neurologicalRisk: 81, 
                    cancerRisk: 82, 
                    copdRisk: 87, 
                    mentalRisk: 84, 
                    gastrointestinalRisk: 85
                }
                //high
            }   
        }
    }
}
function calBPScore(BP){

   if(BP <120){
    return  {
        cardiacRisk: 73,
        kidneyRisk: 62, 
        diabetesRisk: 51, 
        neurologicalRisk: 59, 
        cancerRisk: 42, 
        copdRisk: 64, 
        mentalRisk: 54, 
        gastrointestinalRisk: 73
    }
   }else if(BP < 130){
    return  {
        cardiacRisk: 33,
        kidneyRisk: 52, 
        diabetesRisk: 61, 
        neurologicalRisk: 59, 
        cancerRisk: 42, 
        copdRisk: 54, 
        mentalRisk: 34, 
        gastrointestinalRisk: 43
    }

   }else if(BP < 140){
    return  {
        cardiacRisk: 73,
        kidneyRisk: 82, 
        diabetesRisk: 61, 
        neurologicalRisk: 79, 
        cancerRisk: 72, 
        copdRisk: 74, 
        mentalRisk: 64, 
        gastrointestinalRisk: 67
    }

   }else if(BP < 150){
    return  {
        cardiacRisk: 83,
        kidneyRisk: 85, 
        diabetesRisk: 86, 
        neurologicalRisk: 84, 
        cancerRisk: 87, 
        copdRisk: 84, 
        mentalRisk: 84, 
        gastrointestinalRisk: 87
    }
   }else{
    return  {
        cardiacRisk: 94,
        kidneyRisk: 93, 
        diabetesRisk: 92, 
        neurologicalRisk: 91, 
        cancerRisk: 93, 
        copdRisk: 95, 
        mentalRisk: 96, 
        gastrointestinalRisk: 94
    }
   }
}
function calHRScore(hr){
    if(hr < 70){
        return  {
            cardiacRisk: 53,
            kidneyRisk: 42, 
            diabetesRisk: 61, 
            neurologicalRisk: 72, 
            cancerRisk: 64, 
            copdRisk: 68, 
            mentalRisk: 63, 
            gastrointestinalRisk: 73
        }
    }else if(hr < 80){
        return  {
            cardiacRisk: 12,
            kidneyRisk: 13, 
            diabetesRisk: 15, 
            neurologicalRisk: 17, 
            cancerRisk: 14, 
            copdRisk: 13, 
            mentalRisk: 18, 
            gastrointestinalRisk: 16
        }

    }else if(hr < 90){
        return  {
            cardiacRisk: 23,
            kidneyRisk: 22, 
            diabetesRisk: 24, 
            neurologicalRisk: 21, 
            cancerRisk: 20, 
            copdRisk: 24, 
            mentalRisk: 25, 
            gastrointestinalRisk: 26
        }

    }else if(hr < 100){
        return  {
            cardiacRisk: 32,
            kidneyRisk: 33, 
            diabetesRisk: 35, 
            neurologicalRisk: 47, 
            cancerRisk: 24, 
            copdRisk: 33, 
            mentalRisk: 38, 
            gastrointestinalRisk: 36
        }

    }else{
        return  {
            cardiacRisk: 92,
            kidneyRisk: 83, 
            diabetesRisk: 85, 
            neurologicalRisk: 87, 
            cancerRisk: 83, 
            copdRisk: 84, 
            mentalRisk: 88, 
            gastrointestinalRisk: 84
        }
    }
}
function calHRVScore(hrv){

    if(hrv < 50){
        return  {
            cardiacRisk: 35,
            kidneyRisk: 37, 
            diabetesRisk: 38, 
            neurologicalRisk: 52, 
            cancerRisk: 45, 
            copdRisk: 43, 
            mentalRisk: 48, 
            gastrointestinalRisk: 52
        }
    }else if(hrv < 60){
        return  {
            cardiacRisk: 45,
            kidneyRisk: 57, 
            diabetesRisk: 42, 
            neurologicalRisk: 44, 
            cancerRisk: 52,
            copdRisk: 51, 
            mentalRisk: 53, 
            gastrointestinalRisk: 42
        }
    }else if(hrv < 70){
        return  {
            cardiacRisk: 33,
            kidneyRisk: 35, 
            diabetesRisk: 34, 
            neurologicalRisk: 23, 
            cancerRisk: 42, 
            copdRisk: 35, 
            mentalRisk: 32, 
            gastrointestinalRisk: 23
        }
    }else if(hrv < 80){
        return  {
            cardiacRisk: 61,
            kidneyRisk: 72, 
            diabetesRisk: 82, 
            neurologicalRisk: 62, 
            cancerRisk: 65, 
            copdRisk: 73, 
            mentalRisk: 68, 
            gastrointestinalRisk: 62
        }
    }else{
        return  {
            cardiacRisk: 85,
            kidneyRisk: 93, 
            diabetesRisk: 95, 
            neurologicalRisk: 82, 
            cancerRisk: 85, 
            copdRisk: 89, 
            mentalRisk: 88, 
            gastrointestinalRisk: 83
        }
    }
}
function calSPO2Score(spo2){

    if(spo2 < 95){return  {
        cardiacRisk: 95,
        kidneyRisk: 97, 
        diabetesRisk: 88, 
        neurologicalRisk: 82, 
        cancerRisk: 85, 
        copdRisk: 83, 
        mentalRisk: 93, 
        gastrointestinalRisk: 92
    }

    }else if(spo2 < 96){
        return  {
            cardiacRisk: 85,
            kidneyRisk: 87, 
            diabetesRisk: 78, 
            neurologicalRisk: 62, 
            cancerRisk: 75, 
            copdRisk: 73, 
            mentalRisk: 78, 
            gastrointestinalRisk: 72
        }
    }else if(spo2 < 97){
        return  {
            cardiacRisk: 55,
            kidneyRisk: 57, 
            diabetesRisk: 48, 
            neurologicalRisk: 52, 
            cancerRisk: 53, 
            copdRisk: 48, 
            mentalRisk: 50, 
            gastrointestinalRisk: 48
        }
    }else if(spo2 < 98){
        return  {
            cardiacRisk: 33,
            kidneyRisk: 34, 
            diabetesRisk: 35, 
            neurologicalRisk: 52, 
            cancerRisk: 45, 
            copdRisk: 43, 
            mentalRisk: 48, 
            gastrointestinalRisk: 52
        }
    }else{
        return  {
            cardiacRisk: 13,
            kidneyRisk: 14, 
            diabetesRisk: 15, 
            neurologicalRisk: 12, 
            cancerRisk: 14, 
            copdRisk: 12, 
            mentalRisk: 11, 
            gastrointestinalRisk: 13
        }
    }
}
function calRRScore(rr){

    if(rr < 12){
        return  {
            cardiacRisk: 93,
            kidneyRisk: 94, 
            diabetesRisk: 95, 
            neurologicalRisk: 97, 
            cancerRisk: 95, 
            copdRisk: 93, 
            mentalRisk: 95, 
            gastrointestinalRisk: 94
        }
    }else if(rr < 13){
        return  {
            cardiacRisk: 82,
            kidneyRisk: 83, 
            diabetesRisk: 83, 
            neurologicalRisk: 78, 
            cancerRisk: 84, 
            copdRisk: 82, 
            mentalRisk: 81, 
            gastrointestinalRisk: 89
        }
    }else if(rr < 14){
        return  {
            cardiacRisk: 62,
            kidneyRisk: 61, 
            diabetesRisk: 61, 
            neurologicalRisk: 63, 
            cancerRisk: 64, 
            copdRisk: 61, 
            mentalRisk: 59, 
            gastrointestinalRisk: 53
        }
    }else if(rr < 15){
        return  {
            cardiacRisk: 32,
            kidneyRisk: 23, 
            diabetesRisk: 33, 
            neurologicalRisk: 38, 
            cancerRisk: 24, 
            copdRisk: 22, 
            mentalRisk: 31, 
            gastrointestinalRisk: 29
        }
    }else{
        return  {
            cardiacRisk: 12,
            kidneyRisk: 13, 
            diabetesRisk: 13, 
            neurologicalRisk: 16, 
            cancerRisk: 19, 
            copdRisk: 15, 
            mentalRisk: 13, 
            gastrointestinalRisk: 18
        }
    }
}
  