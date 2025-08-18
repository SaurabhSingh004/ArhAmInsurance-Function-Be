const {logError} = require('../utils/logError');

class screenController {
    /**
     * Get home screen data
     * @param {Object} request - Request object
     * @param {Object} context - Context object
     */
    getHomeScreenData = async (request, context) => {
        try {
            const user = context.user;
            
            if (!user) {
                context.log("No user found in request");
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const homeScreenData = {
                goal: [
                    {
                        icon: "walk",
                        title: "Walk 10,000 step",
                        isCompleted: true
                    },
                    {
                        icon: "water",
                        title: "Drink 2L water",
                        isCompleted: true
                    },
                    {
                        icon: "fruit",
                        title: "Eat 5 serving of fruits",
                        isCompleted: true
                    },
                    {
                        icon: "sleep",
                        title: "Sleep 8 hours",
                        isCompleted: false
                    },
                    {
                        icon: "workout",
                        title: "30 mins exercise",
                        isCompleted: false
                    }
                ],
                vehicle: [
                    {
                        icon: "vehicle",
                        type: "vehicle_registration",
                        title: "Registration"
                    },
                    {
                        icon: "ticket",
                        type: "challan",
                        title: "Challan"
                    },
                    {
                        icon: "report",
                        type: "vehicle_puc",
                        title: "PUC"
                    },
                    {
                        icon: "shield",
                        type: "vehicle_insurance",
                        title: "Insurance"
                    },
                    {
                        icon: "folder",
                        type: "document_manager",
                        title: "DOC Manager"
                    },
                    {
                        icon: "graph",
                        type: "evaluation",
                        title: "Evaluation"
                    }
                ],
                insurance: [
                    {
                        icon: "download",
                        type: "policy_download",
                        title: "Download Policy"
                    },
                    {
                        icon: "card",
                        type: "file_claim_cashless",
                        title: "File a Claim(Cashless)"
                    },
                    {
                        icon: "search",
                        type: "track_claim",
                        title: "Track a Claim"
                    },
                    {
                        icon: "edit",
                        type: "update_policy",
                        title: "Update Policy"
                    },
                    {
                        icon: "contact",
                        type: "update_contact",
                        title: "Update Contact"
                    },
                    {
                        icon: "hospital",
                        type: "network_hospital",
                        title: "Network Hospitals"
                    }
                ],
                health_wellness: {
                    point: 1250,
                    options: [
                        {
                            icon: "calculator",
                            type: "bmi_calculator",
                            point: 10,
                            title: "BMI Calculator"
                        },
                        {
                            icon: "heart",
                            type: "wellness_assessment",
                            point: 15,
                            title: "Wellness Assessment"
                        },
                        {
                            icon: "dollar",
                            type: "medical_expense",
                            point: 5,
                            title: "Medical Expenses"
                        },
                        {
                            icon: "chat",
                            type: "talk_patient",
                            point: 20,
                            title: "Talk to Coach"
                        },
                        {
                            icon: "breath",
                            type: "breath_exercise",
                            point: 25,
                            title: "Breathing Exercises"
                        },
                        {
                            icon: "warning",
                            type: "pre_diabetes_risk",
                            point: 30,
                            title: "Pre Diabetes Risk"
                        },
                        {
                            icon: "camera",
                            type: "face_scan",
                            point: 25,
                            title: "Face Scan"
                        },
                        {
                            icon: "camera",
                            type: "food_scan",
                            point: 15,
                            title: "Food Scan"
                        },
                        {
                            icon: "book",
                            type: "log_meal",
                            point: 10,
                            title: "Log Meal"
                        },
                        {
                            icon: "leaf",
                            type: "generate_diet",
                            point: 10,
                            title: "Generate Diet"
                        }
                    ]
                }
            };

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: homeScreenData,
                    message: 'Home screen data retrieved successfully'
                }
            };

        } catch (error) {
            const err = logError('getHomeScreenData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch home screen data',
                    error: err.message
                }
            };
        }
    }

    /**
     * Get discovery screen data
     * @param {Object} request - Request object
     * @param {Object} context - Context object
     */
    getDiscoveryScreenData = async (request, context) => {
        try {
            const user = context.user;
            
            if (!user) {
                context.log("No user found in request");
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const discoveryScreenData = {
                feature_service: {
                    image: "https://readdy.ai/api/search-image?query=Modern%20digital%20insurance%20and%20travel%20services%20banner%2C%20professional%20business%20illustration%2C%20clean%20design%20with%20travel%20and%20insurance%20icons%2C%20gradient%20background%2C%20high%20quality%20digital%20art%2C%20contemporary%20style&width=343&height=120&seq=banner001&orientation=landscape",
                    title: "Travel Safe",
                    sub_title: "Get international permit and insurance"
                },
                section: [
                    {
                        section_title: "Travel",
                        section_icon: "plane",
                        option: [
                            {
                                icon: "globe",
                                title: "International Driving Permit",
                                type: "driving_permit"
                            },
                            {
                                icon: "convert",
                                title: "Currency Calculator",
                                type: "currency_calculator"
                            }
                        ]
                    },
                    {
                        section_title: "Cyber",
                        section_icon: "shield",
                        option: [
                            {
                                icon: "data",
                                title: "Check Data Breach",
                                type: "check_breach"
                            },
                            {
                                icon: "info",
                                title: "Report Cyber Crime",
                                type: "report_cyber_crime"
                            },
                            {
                                icon: "database",
                                title: "Data Safety",
                                type: "data_safety"
                            }
                        ]
                    },
                    {
                        section_title: "Insurance Service",
                        section_icon: "umberala",
                        option: [
                            {
                                icon: "calculator",
                                title: "EMI Calculator",
                                type: "emi_calculator"
                            },
                            {
                                icon: "document",
                                title: "File a Claim",
                                type: "file_claim"
                            },
                            {
                                icon: "search",
                                title: "Track Claim",
                                type: "track_claim"
                            },
                            {
                                icon: "renew",
                                title: "Renew Policy",
                                type: "renew_policy"
                            }
                        ]
                    },
                    {
                        section_title: "Buy Insurance",
                        section_icon: "umberala",
                        option: [
                            {
                                icon: "heart",
                                title: "Health Insurance",
                                type: "health_insurance"
                            },
                            {
                                icon: "plane",
                                title: "Travel Insurance",
                                type: "travel_insurance"
                            },
                            {
                                icon: "car",
                                title: "Vehicle Insurance",
                                type: "vehicle_insurance"
                            },
                            {
                                icon: "laptop",
                                title: "Cyber Insurance",
                                type: "cyber_insurance"
                            },
                            {
                                icon: "pet",
                                title: "Pet Insurance",
                                type: "pet_insurance"
                            },
                            {
                                icon: "home",
                                title: "Home Insurance",
                                type: "home_insurance"
                            }
                        ]
                    }
                ]
            };

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: discoveryScreenData,
                    message: 'Discovery screen data retrieved successfully'
                }
            };

        } catch (error) {
            const err = logError('getDiscoveryScreenData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch discovery screen data',
                    error: err.message
                }
            };
        }
    }

    /**
     * Get policy screen data
     * @param {Object} request - Request object
     * @param {Object} context - Context object
     */
    getPolicyScreenData = async (request, context) => {
        try {
            const user = context.user;
            
            if (!user) {
                context.log("No user found in request");
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const policyScreenData = {
                insurance_service: [
                    {
                        icon: "download",
                        title: "Download Policy",
                        type: "download_policy"
                    },
                    {
                        icon: "card",
                        title: "File a Claim (Cashless)",
                        type: "file_claim_cashless"
                    },
                    {
                        icon: "search",
                        title: "Track a Claim",
                        type: "track_claim"
                    },
                    {
                        icon: "health_card",
                        title: "Download Health Claim",
                        type: "download_health_claim"
                    },
                    {
                        icon: "tax",
                        title: "Tax Certificate",
                        type: "tax_certificate"
                    },
                    {
                        icon: "edit",
                        title: "Update Policy",
                        type: "update_policy"
                    },
                    {
                        icon: "contact",
                        title: "Update Contact",
                        type: "update_contact"
                    },
                    {
                        icon: "hospital",
                        title: "Network Hospitals",
                        type: "network_hospitals"
                    }
                ],
                vehicle_document: {
                    expiring_document: 2,
                    options: [
                        {
                            icon: "car",
                            title: "Registration",
                            type: "registration",
                            status: "expires_soon"
                        },
                        {
                            icon: "ticket",
                            title: "Challan",
                            type: "challan",
                            status: "expires_soon"
                        },
                        {
                            icon: "checklist",
                            title: "PUC",
                            type: "puc",
                            status: ""
                        },
                        {
                            icon: "shield",
                            title: "Insurance",
                            type: "insurance",
                            status: ""
                        },
                        {
                            icon: "folder",
                            title: "DOC Manager",
                            type: "doc_manager",
                            status: ""
                        },
                        {
                            icon: "graph",
                            title: "Evaluation",
                            type: "evaluation",
                            status: ""
                        }
                    ]
                }
            };

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: policyScreenData,
                    message: 'Policy screen data retrieved successfully'
                }
            };

        } catch (error) {
            const err = logError('getPolicyScreenData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch policy screen data',
                    error: err.message
                }
            };
        }
    }
}

module.exports = new screenController();