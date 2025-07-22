const Joi = require('joi')

const userAddUpdateSchema = Joi.object().keys({
    _id: Joi.string().allow(''),
    firebase_id: Joi.string().allow(''),
    parent_id: Joi.string().allow(''),
    name: Joi.string().required(),
    email: Joi.string().required(),
    country_code: Joi.string().allow(''),
    contact: Joi.string().allow(''),
    date_of_birth: Joi.string().required(),
    gender: Joi.string().valid('male', 'female'),
    weight: Joi.number().required(),
    height: Joi.number().required(),
    weight_unit: Joi.string().required(),
    height_feet: Joi.number().required(),
    height_inch: Joi.number().required(),
    is_athlete: Joi.boolean().allow(''),
    profile_photo: Joi.any().allow(''),
    user_domain: Joi.string().required(),
    token: Joi.string().allow(''),
    address1: Joi.string().allow(''),
    country: Joi.string().allow(''),
    district: Joi.string().allow(''),
    state: Joi.string().allow(''),
    pincode: Joi.number().allow(''),
    landmark: Joi.string().allow(''),
    lat: Joi.number().allow(''),
    long: Joi.number().allow(''),
    isMobileVerified: Joi.boolean().allow(''),
});

const guestUserAddUpdateSchema = Joi.object().keys({
    _id: Joi.string().allow(''),
    name: Joi.string().required(),
    email: Joi.string().required(),
    country_code: Joi.string().allow(''),
    contact: Joi.string().allow(''),
    date_of_birth: Joi.string().required(),
    gender: Joi.string().valid('male', 'female'),
    weight: Joi.number().required(),
    height: Joi.number().required(),
    weight_unit: Joi.string().required(),
    height_feet: Joi.number().required(),
    height_inch: Joi.number().required(),
    is_athlete: Joi.boolean().allow(''),
    profile_photo: Joi.any().allow(''),
    user_domain: Joi.string().required(),
    token: Joi.string().allow(''),
    address1: Joi.string().allow(''),
    country: Joi.string().allow(''),
    district: Joi.string().allow(''),
    state: Joi.string().allow(''),
    pincode: Joi.number().allow(),
    landmark: Joi.string().allow(''),
    lat: Joi.number().allow(''),
    long: Joi.number().allow(''),
    isMobileVerified: Joi.boolean().allow(''),
});

const getUserProfileSchema = Joi.object().keys({
    email: Joi.string().required(),
    firebase_id: Joi.string().allow('')
});

const deleteUserSchema = Joi.object().keys({
    user_id: Joi.string().required()
});

const getChildUsersSchema = Joi.object().keys({
    parent_id: Joi.string().required()
});

const addBodyMetricsSchema = Joi.object().keys({
    user_id: Joi.string().required(),
    timestamp: Joi.number().required(),
    device_type: Joi.number().valid(0, 1, 2, 3, 4, 5, 8).allow(''),
    device_id: Joi.string().required(),
    weight: Joi.number().required(),
    bmi: Joi.number().required(),
    body_fat: Joi.number().required(),
    physique: Joi.number().allow(''),
    fat_free_weight: Joi.number().required(),
    subcutaneous_fat: Joi.number().required(),
    visceral_fat: Joi.number().required(),
    body_water: Joi.number().required(),
    skeletal_muscle: Joi.number().required(),
    muscle_mass: Joi.number().required(),
    bone_mass: Joi.number().required(),
    protein: Joi.number().required(),
    bmr: Joi.number().required(),
    metabolic_age: Joi.number().required(),
    health_score: Joi.number().allow(''),
    right_arm_fat: Joi.number().allow(''),
    right_arm_fat_kg: Joi.number().allow(''),
    right_arm_muscle_mass: Joi.number().allow(''),
    right_arm_muscle_mass_kg: Joi.number().allow(''),
    left_arm_fat: Joi.number().allow(''),
    left_arm_fat_kg: Joi.number().allow(''),
    left_arm_muscle_mass: Joi.number().allow(''),
    left_arm_muscle_mass_kg: Joi.number().allow(''),
    right_leg_fat: Joi.number().allow(''),
    right_leg_fat_kg: Joi.number().allow(''),
    right_leg_muscle_mass: Joi.number().allow(''),
    right_leg_muscle_mass_kg: Joi.number().allow(''),
    left_leg_fat: Joi.number().allow(''),
    left_leg_fat_kg: Joi.number().allow(''),
    left_leg_muscle_mass: Joi.number().allow(''),
    left_leg_muscle_mass_kg: Joi.number().allow(''),
    trunk_fat: Joi.number().allow(''),
    trunk_fat_kg: Joi.number().allow(''),
    trunk_muscle_mass: Joi.number().allow(''),
    trunk_muscle_mass_kg: Joi.number().allow(''),
    is_athlete: Joi.boolean().allow('')
});

const getBodyMetricsSchema = Joi.object().keys({
    user_id: Joi.string().required(),
    from: Joi.number().allow('')
});

const getBodyMetricsMailSchema = Joi.object().keys({
    email_id: Joi.string().required(),
    from: Joi.number().allow('')
});

const deleteBodyMetricsSchema = Joi.object().keys({
    user_id: Joi.string().required()
});

const downloadCSVSchema = Joi.object().keys({
    user_id: Joi.string().required()
});

const addBodyMeasurementsSchema = Joi.object().keys({
    user_id: Joi.string().required(),
    timestamp: Joi.number().required(),
    abdomen: Joi.number().required(),
    shoulder: Joi.number().required(),
    bicep_left: Joi.number().required(),
    bicep_right: Joi.number().required(),
    calves_left: Joi.number().required(),
    calves_right: Joi.number().required(),
    chest: Joi.number().required(),
    forearm_left: Joi.number().required(),
    forearm_right: Joi.number().required(),
    hips: Joi.number().required(),
    neck: Joi.number().required(),
    thighs_left: Joi.number().required(),
    thighs_right: Joi.number().required(),
    waist: Joi.number().required()
})

const getBodyMeasurementsSchema = Joi.object().keys({
    user_id: Joi.string().required(),
    from: Joi.number().allow('')
})

const deleteBodyMeasurementsSchema = Joi.object().keys({
    user_id: Joi.string().required(),
    timestamp: Joi.number().required()
});

const getReadingByIdSchema = Joi.object().keys({
    _id: Joi.string().required()
});

const sendEmailToClientSchema = Joi.object().keys({
    SenderName: Joi.string().required(),
    SenderEmail: Joi.string().required(),
    RecipientEmail: Joi.string().required(),
    Subject: Joi.string().required(),
    BodyTextData: Joi.string().allow(''),
    BodyHTMLTemplate: Joi.string().required(),
    Charset: Joi.string().required(),
})

const bodyParametersAnalyticSchema = Joi.object().keys({
    parameter: Joi.string().valid('bmi', 'body_fat', 'visceral_fat', 'weight', 'bone_mass', 'muscle_mass', 'skeletal_muscle', 'subcutaneous_fat').required(),
    value: Joi.number().required(),
})

const smartscaleData = {
    user_id: Joi.string().required(),
    timestamp: Joi.number().required(),
    device_id: Joi.string().required(),
    gender: Joi.string().allow(''),
    weight: Joi.number().required(),
    height: Joi.number().allow(''),
    bmi: Joi.number().required(),
    body_fat: Joi.number().required(),
    physique: Joi.number().required(),
    fat_free_weight: Joi.number().required(),
    subcutaneous_fat: Joi.number().required(),
    visceral_fat: Joi.number().required(),
    body_water: Joi.number().required(),
    skeletal_muscle: Joi.number().required(),
    muscle_mass: Joi.number().required(),
    bone_mass: Joi.number().required(),
    protein: Joi.number().required(),
    bmr: Joi.number().required(),
    metabolic_age: Joi.number().required(),
    health_score: Joi.number().required(),
    is_athlete: Joi.boolean().allow('')
}

const addHealthKioskData = Joi.object().keys({
    user_id: Joi.string().required(),
    timestamp: Joi.number().required(),
    height: Joi.number().allow(''),
    smartscale_data: Joi.object(smartscaleData).allow(''),
    systolic_pressure: Joi.number().allow(''),
    diastolic_pressure: Joi.number().allow(''),
    bp_pulse: Joi.number().allow(''),
    spo2_concentration: Joi.number().allow(''),
    spo2_pulse: Joi.number().allow(''),
    blood_glucose_level: Joi.number().allow(''),
    blood_group: Joi.number().valid(1, 2, 3, 4, 5, 6, 7, 8).allow('')
})

const getHealthKioskData = Joi.object().keys({
    user_id: Joi.string().required(),
    from: Joi.number().allow('')
})

const deleteHealthKioskData = Joi.object().keys({
    user_id: Joi.string().required()
})

const verifyOTPSchema = Joi.object().keys({
    email_id: Joi.string().allow(''),
    session_id: Joi.string().required(),
    otp: Joi.string().length(6).regex(/^[0-9]+$/).required()
})

const firebaseEmailLogin = Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const firebaseEmailRegistration = Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    displayName: Joi.string().required()
});

const firebaseEmailPasswordReset = Joi.object().keys({
    email: Joi.string().email().required()
});

const lockSmartscaleSchema = Joi.object().keys({
    email: Joi.string().email().required(),
    mac_address: Joi.string().required()
});

const firebaseSubscriptionCheck = Joi.object().keys({
    email: Joi.string().email().required()
});

const fnAddUpdateSubscription = Joi.object().keys({
    email: Joi.string().email().required(),
    duration: Joi.number().allow('')
});

const enterChallenge = Joi.object().keys({
    user_id: Joi.string().required(),
    challenge_id: Joi.string().required(),
    enrollment_date: Joi.date().timestamp().required()
});

const weeklyReading = Joi.object().keys({
    user_id: Joi.string().required(),
    challenge_id: Joi.string().required(),
    week: Joi.number().required(),
    reading_id: Joi.string().required()
});

const leaveChallenge = Joi.object().keys({
    user_id: Joi.string().required(),
    challenge_id: Joi.string().required()
});

const challengeData = Joi.object().keys({
    user_id: Joi.string().required(),
    challenge_id: Joi.string().required()
});

const wcleaderboard = Joi.object().keys({
    week: Joi.number().required(),
    challenge_id: Joi.string().required(),
    max: Joi.string().required(),
    min: Joi.string().required(),
    offset: Joi.number().required(),
    count: Joi.number().required()
});

const deviceNotificationSchema = Joi.object().keys({
    title: Joi.string().required(),
    body: Joi.string().required(),
    payload: Joi.string().required(),
    email: Joi.string().email().required(),

})

const getLiveDoctorsForThirdPartySchema = Joi.object().keys({
    lang: Joi.string().required(),
    name: Joi.string().required(),
    telephone: Joi.string().required(),
    age: Joi.number().required().allow(''),
    sex: Joi.string().required().allow(''),
    email: Joi.string(),
    specialityId: Joi.number().allow(''),
});

const callDoctorThirdPartySchema = Joi.object().keys({
    userId: Joi.number().required(),
    doctorId: Joi.number().required(),
    labReportUrl: Joi.string().allow(''),
    actofitUserId: Joi.string().required(),
    speciality:Joi.string(), 
    doctorName:Joi.string(), 
    doctorImageUrl: Joi.string()
});

const getDoctorCallHistory = Joi.object().keys({
    actofitUserId: Joi.string().required(),
});

const getRxThirdPartySchema = Joi.object().keys({
    actofitUserId: Joi.string().required(),
});

const getUserAddressesSchema = Joi.object().keys({
    actofitUserId: Joi.string().required(),
});

const addUserAddressSchema = Joi.object().keys({
    actofitUserId: Joi.string().required(),
    userName: Joi.string().required(),
    mobile: Joi.string().required(),
    addressLine1: Joi.string().required(),
    addressLine2: Joi.string().required(),
    pincode: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
});

const orderPrescriptionMedicineSchema = Joi.object().keys({
    actofitUserId: Joi.string().required(),
    prescriptionId: Joi.number().allow(''),
    addressId: Joi.number().allow(''),
});

const validate = (schema = null) => {
    return (req, res, next) => {
        switch (schema) {

            // USERS API VALIDATION  
            case 'user_profile_add_update': var Schema = userAddUpdateSchema; break;
            case 'get_user_profile': var Schema = getUserProfileSchema; break;
            case 'delete_user': var Schema = deleteUserSchema; break;
            case 'get_child_users': var Schema = getChildUsersSchema; break;
            case 'guest_user_profile_add_update': var Schema = guestUserAddUpdateSchema; break;

            // BODY COMPOSITION METRICS API VALIDATION
            case 'add_body_metrics': var Schema = addBodyMetricsSchema; break;
            case 'get_body_metrics': var Schema = getBodyMetricsSchema; break;
            case 'get_body_metrics_mail': var Schema = getBodyMetricsMailSchema; break;
            case 'delete_body_metrics': var Schema = deleteBodyMetricsSchema; break;
            case 'download_user_data': var Schema = downloadCSVSchema; break;
            case 'get_metrics_by_id': var Schema = getReadingByIdSchema; break;

            // BODY MEASUREMENTS API VALIDATION
            case 'add_body_measurements': var Schema = addBodyMeasurementsSchema; break;
            case 'get_body_measurements': var Schema = getBodyMeasurementsSchema; break;
            case 'delete_body_measurements': var Schema = deleteBodyMeasurementsSchema; break;

            // EMAIL SERVICES API VALIDATION
            case 'send_email': var Schema = sendEmailToClientSchema; break;

            // ANALYTICS
            case 'body_parameter_analytics': var Schema = bodyParametersAnalyticSchema; break;

            // HEALTH KIOSK
            case 'add_health_kiosk': var Schema = addHealthKioskData; break;
            case 'get_health_kiosk': var Schema = getHealthKioskData; break;
            case 'delete_health_kiosk': var Schema = deleteHealthKioskData; break;

            // OTP
            case 'verify_otp': var Schema = verifyOTPSchema; break;

            // FIREBASE AUTH
            case 'firebase_email_registration': var Schema = firebaseEmailRegistration; break;
            case 'firebase_email_login': var Schema = firebaseEmailLogin; break;
            case 'firebase_email_password_reset': var Schema = firebaseEmailPasswordReset; break;
            case 'lock_smartscale': var Schema = lockSmartscaleSchema; break;
            case 'subscription_check': var Schema = firebaseSubscriptionCheck; break;
            case 'subscription_add_update': var Schema = fnAddUpdateSubscription; break;

            // WELLNESS CHALLENGE
            case 'enter_challenge': var Schema = enterChallenge; break;
            case 'weekly_reading': var Schema = weeklyReading; break;
            case 'challenge_data': var Schema = challengeData; break;
            case 'leave_challenge': var Schema = leaveChallenge; break;
            case 'wc_leaderboard': var Schema = wcleaderboard; break;

            // fcm
            case 'send_to_device': var Schema = deviceNotificationSchema; break;
            //case 'multicast_notification': var Schema = multicastNotificationSchema; break;

            //doctor consultation
            case 'live_doctors': var Schema = getLiveDoctorsForThirdPartySchema; break;
            case 'call_doctor': var Schema = callDoctorThirdPartySchema; break;
            case 'get_rx': var Schema = getRxThirdPartySchema; break;
            case 'user_addresses': var Schema = getUserAddressesSchema; break;
            case 'add_user_address': var Schema = addUserAddressSchema; break;
            case 'order_prescription_medicine': var Schema = orderPrescriptionMedicineSchema; break;
            case 'call_doctor_history': var Schema = getDoctorCallHistory; break;

        }
        if (!Schema) {
            return next(new Error('Schema flag is not defined in validation'))
        } else {
            var body = req.body;
            var query = req.query;
            var params = req.params;
            var data = Object.assign({}, body, query, params)
            if (typeof data == 'string') {
                data = JSON.parse(data)
            }
            Joi.validate(data, Schema, (err, value) => {
                if (!err) return next();
                else {
                    res.status(400).json({
                        message: 'invalid data',
                        error: err
                    })
                }
            })
        }
    }
}

module.exports = validate;