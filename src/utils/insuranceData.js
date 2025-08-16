// helpers/insuranceData.js
const mauritiusInsurances = {
    health: [
        {
            id: 'h001',
            name: 'Swan Life Health Plus',
            company: 'Swan Life Ltd',
            coverage: 'Comprehensive health coverage',
            premium: 'Rs 15,000 - Rs 50,000 annually',
            features: ['Hospitalization', 'Outpatient care', 'Dental & Optical', 'Maternity'],
            contactNumber: '+230 402 5000',
            website: 'https://www.swan.mu'
        },
        {
            id: 'h002',
            name: 'BAI Health Shield',
            company: 'British American Insurance',
            coverage: 'Individual & Family health plans',
            premium: 'Rs 12,000 - Rs 45,000 annually',
            features: ['Emergency care', 'Specialist consultations', 'Pharmacy benefits', 'Preventive care'],
            contactNumber: '+230 202 5000',
            website: 'https://www.bai.mu'
        },
        {
            id: 'h003',
            name: 'Mauritius Union Health Care',
            company: 'Mauritius Union Assurance',
            coverage: 'Premium health insurance',
            premium: 'Rs 18,000 - Rs 60,000 annually',
            features: ['Private ward coverage', 'International treatment', 'Cancer care', 'Mental health'],
            contactNumber: '+230 207 5500',
            website: 'https://www.mua.mu'
        },
        {
            id: 'h004',
            name: 'SICOM Health Protect',
            company: 'SICOM General Insurance',
            coverage: 'Affordable health protection',
            premium: 'Rs 8,000 - Rs 30,000 annually',
            features: ['Basic hospitalization', 'Emergency services', 'Generic medicines', 'Day care procedures'],
            contactNumber: '+230 203 5000',
            website: 'https://www.sicom.mu'
        }
    ],

    travel: [
        {
            id: 't001',
            name: 'Swan Travel Guardian',
            company: 'Swan Life Ltd',
            coverage: 'Worldwide travel protection',
            premium: 'Rs 500 - Rs 5,000 per trip',
            features: ['Medical expenses abroad', 'Trip cancellation', 'Lost baggage', 'Flight delays'],
            contactNumber: '+230 402 5000',
            website: 'https://www.swan.mu'
        },
        {
            id: 't002',
            name: 'BAI Globe Trotter',
            company: 'British American Insurance',
            coverage: 'International travel insurance',
            premium: 'Rs 400 - Rs 4,500 per trip',
            features: ['Emergency evacuation', 'Personal liability', 'Adventure sports', 'Business travel'],
            contactNumber: '+230 202 5000',
            website: 'https://www.bai.mu'
        },
        {
            id: 't003',
            name: 'MUA Journey Safe',
            company: 'Mauritius Union Assurance',
            coverage: 'Premium travel coverage',
            premium: 'Rs 600 - Rs 6,000 per trip',
            features: ['Luxury travel protection', 'Cruise coverage', 'Golf equipment', 'VIP assistance'],
            contactNumber: '+230 207 5500',
            website: 'https://www.mua.mu'
        }
    ],

    vehicle: [
        {
            id: 'v001',
            name: 'Swan Motor Comprehensive',
            company: 'Swan Life Ltd',
            coverage: 'Full vehicle protection',
            premium: '3.5% - 5% of vehicle value annually',
            features: ['Third party liability', 'Own damage', 'Theft protection', 'Natural disasters'],
            contactNumber: '+230 402 5000',
            website: 'https://www.swan.mu'
        },
        {
            id: 'v002',
            name: 'BAI Auto Shield',
            company: 'British American Insurance',
            coverage: 'Motor vehicle insurance',
            premium: '3% - 4.5% of vehicle value annually',
            features: ['Accident coverage', 'Windscreen protection', 'Emergency roadside', 'Rental car'],
            contactNumber: '+230 202 5000',
            website: 'https://www.bai.mu'
        },
        {
            id: 'v003',
            name: 'MUA Motor Plus',
            company: 'Mauritius Union Assurance',
            coverage: 'Premium motor insurance',
            premium: '4% - 6% of vehicle value annually',
            features: ['Luxury car coverage', 'Import vehicle', 'Modified vehicles', 'Track day coverage'],
            contactNumber: '+230 207 5500',
            website: 'https://www.mua.mu'
        },
        {
            id: 'v004',
            name: 'SICOM Vehicle Guard',
            company: 'SICOM General Insurance',
            coverage: 'Essential motor protection',
            premium: '2.5% - 4% of vehicle value annually',
            features: ['Basic third party', 'Fire & theft', 'Natural calamities', 'Personal accident'],
            contactNumber: '+230 203 5000',
            website: 'https://www.sicom.mu'
        }
    ],

    cyber: [
        {
            id: 'c001',
            name: 'Swan Cyber Shield',
            company: 'Swan Life Ltd',
            coverage: 'Cyber liability protection',
            premium: 'Rs 10,000 - Rs 100,000 annually',
            features: ['Data breach response', 'Cyber extortion', 'Business interruption', 'Legal expenses'],
            contactNumber: '+230 402 5000',
            website: 'https://www.swan.mu'
        },
        {
            id: 'c002',
            name: 'BAI Digital Protect',
            company: 'British American Insurance',
            coverage: 'Cybersecurity insurance',
            premium: 'Rs 8,000 - Rs 80,000 annually',
            features: ['Identity theft', 'Online fraud', 'Ransomware protection', 'Privacy violation'],
            contactNumber: '+230 202 5000',
            website: 'https://www.bai.mu'
        },
        {
            id: 'c003',
            name: 'MUA Cyber Defense',
            company: 'Mauritius Union Assurance',
            coverage: 'Enterprise cyber protection',
            premium: 'Rs 15,000 - Rs 150,000 annually',
            features: ['Network security', 'Cloud protection', 'Mobile device', 'Regulatory fines'],
            contactNumber: '+230 207 5500',
            website: 'https://www.mua.mu'
        }
    ],

    pet: [
        {
            id: 'p001',
            name: 'Swan Pet Care',
            company: 'Swan Life Ltd',
            coverage: 'Comprehensive pet insurance',
            premium: 'Rs 2,000 - Rs 15,000 annually',
            features: ['Veterinary bills', 'Surgery costs', 'Vaccination', 'Emergency care'],
            contactNumber: '+230 402 5000',
            website: 'https://www.swan.mu'
        },
        {
            id: 'p002',
            name: 'BAI Animal Guardian',
            company: 'British American Insurance',
            coverage: 'Pet health protection',
            premium: 'Rs 1,500 - Rs 12,000 annually',
            features: ['Illness treatment', 'Accident coverage', 'Dental care', 'Behavioral therapy'],
            contactNumber: '+230 202 5000',
            website: 'https://www.bai.mu'
        },
        {
            id: 'p003',
            name: 'MUA Pet Plus',
            company: 'Mauritius Union Assurance',
            coverage: 'Premium pet insurance',
            premium: 'Rs 3,000 - Rs 20,000 annually',
            features: ['Exotic animals', 'Breeding coverage', 'Show animals', 'International travel'],
            contactNumber: '+230 207 5500',
            website: 'https://www.mua.mu'
        }
    ],

    home: [
        {
            id: 'ho001',
            name: 'Swan Home Secure',
            company: 'Swan Life Ltd',
            coverage: 'Complete home protection',
            premium: '0.2% - 0.5% of property value annually',
            features: ['Structure damage', 'Contents insurance', 'Natural disasters', 'Theft protection'],
            contactNumber: '+230 402 5000',
            website: 'https://www.swan.mu'
        },
        {
            id: 'ho002',
            name: 'BAI Property Shield',
            company: 'British American Insurance',
            coverage: 'Residential property insurance',
            premium: '0.15% - 0.4% of property value annually',
            features: ['Building insurance', 'Personal belongings', 'Liability coverage', 'Alternative accommodation'],
            contactNumber: '+230 202 5000',
            website: 'https://www.bai.mu'
        },
        {
            id: 'ho003',
            name: 'MUA Home Elite',
            company: 'Mauritius Union Assurance',
            coverage: 'Luxury home insurance',
            premium: '0.3% - 0.7% of property value annually',
            features: ['High-value homes', 'Art & jewelry', 'Swimming pools', 'Smart home systems'],
            contactNumber: '+230 207 5500',
            website: 'https://www.mua.mu'
        },
        {
            id: 'ho004',
            name: 'SICOM Home Guard',
            company: 'SICOM General Insurance',
            coverage: 'Basic home protection',
            premium: '0.1% - 0.3% of property value annually',
            features: ['Fire insurance', 'Cyclone coverage', 'Basic contents', 'Public liability'],
            contactNumber: '+230 203 5000',
            website: 'https://www.sicom.mu'
        }
    ]
};

const getInsurancesByType = (type) => {
    return mauritiusInsurances[type] || [];
};

const getAllInsuranceTypes = () => {
    return Object.keys(mauritiusInsurances);
};

module.exports = {
    mauritiusInsurances,
    getInsurancesByType,
    getAllInsuranceTypes
};