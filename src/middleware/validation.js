// middleware/validation.js
const { body, param, query } = require('express-validator');

// Validation for creating a sub-account
const validateSubAccount = [
  body('modeSelection')
    .isIn(['Baby Mode', 'Toddler Mode', 'Child Mode', 'Teen Mode', 'Standard Mode', 'Athlete Mode'])
    .withMessage('Invalid mode selection'),
  
  body('isSubscribed')
    .optional()
    .isBoolean()
    .withMessage('isSubscribed must be a boolean'),

  // Profile validation
  body('profile')
    .notEmpty()
    .withMessage('Profile data is required'),

  body('profile.firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),

  body('profile.lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),

  body('profile.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),

  body('profile.gender')
    .optional()
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),

  body('profile.age')
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage('Age must be a number between 0 and 150'),

  body('profile.phoneNumber')
    .optional()
    .isNumeric()
    .withMessage('Phone number must be numeric'),

  body('profile.profilePhoto')
    .optional()
    .isURL()
    .withMessage('Profile photo must be a valid URL'),

  body('profile.bannerPhoto')
    .optional()
    .isURL()
    .withMessage('Banner photo must be a valid URL'),

  body('profile.height')
    .optional()
    .isNumeric()
    .withMessage('Height must be numeric'),

  body('profile.weight')
    .optional()
    .isNumeric()
    .withMessage('Weight must be numeric'),

  body('profile.height_unit')
    .optional()
    .isIn(['cm', 'ft', 'in'])
    .withMessage('Height unit must be cm, ft, or in'),

  body('profile.weight_unit')
    .optional()
    .isIn(['kg', 'lbs'])
    .withMessage('Weight unit must be kg or lbs'),

  body('profile.isAthlete')
    .optional()
    .isBoolean()
    .withMessage('isAthlete must be a boolean'),

  body('profile.address')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Address must not exceed 200 characters'),

  body('profile.state')
    .optional()
    .isLength({ max: 50 })
    .withMessage('State must not exceed 50 characters'),

  body('profile.district')
    .optional()
    .isLength({ max: 50 })
    .withMessage('District must not exceed 50 characters'),

  body('profile.pincode')
    .optional()
    .isNumeric()
    .withMessage('Pincode must be numeric'),

  body('profile.country')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Country must not exceed 50 characters'),

  body('profile.countryCode')
    .optional()
    .isLength({ min: 2, max: 3 })
    .withMessage('Country code must be 2-3 characters'),

  body('profile.landmark')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Landmark must not exceed 100 characters')
];

// Validation for updating a sub-account
const validateSubAccountUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid sub-account ID'),

  body('modeSelection')
    .optional()
    .isIn(['Baby Mode', 'Toddler Mode', 'Child Mode', 'Teen Mode', 'Standard Mode', 'Athlete Mode'])
    .withMessage('Invalid mode selection'),
  
  body('isSubscribed')
    .optional()
    .isBoolean()
    .withMessage('isSubscribed must be a boolean'),

  // Profile validation (all optional for updates)
  body('profile.firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),

  body('profile.lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),

  body('profile.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),

  body('profile.gender')
    .optional()
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),

  body('profile.age')
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage('Age must be a number between 0 and 150'),

  body('profile.phoneNumber')
    .optional()
    .isNumeric()
    .withMessage('Phone number must be numeric'),

  body('profile.profilePhoto')
    .optional()
    .isURL()
    .withMessage('Profile photo must be a valid URL'),

  body('profile.bannerPhoto')
    .optional()
    .isURL()
    .withMessage('Banner photo must be a valid URL'),

  body('profile.height')
    .optional()
    .isNumeric()
    .withMessage('Height must be numeric'),

  body('profile.weight')
    .optional()
    .isNumeric()
    .withMessage('Weight must be numeric'),

  body('profile.height_unit')
    .optional()
    .isIn(['cm', 'ft', 'in'])
    .withMessage('Height unit must be cm, ft, or in'),

  body('profile.weight_unit')
    .optional()
    .isIn(['kg', 'lbs'])
    .withMessage('Weight unit must be kg or lbs'),

  body('profile.isAthlete')
    .optional()
    .isBoolean()
    .withMessage('isAthlete must be a boolean'),

  body('profile.address')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Address must not exceed 200 characters'),

  body('profile.state')
    .optional()
    .isLength({ max: 50 })
    .withMessage('State must not exceed 50 characters'),

  body('profile.district')
    .optional()
    .isLength({ max: 50 })
    .withMessage('District must not exceed 50 characters'),

  body('profile.pincode')
    .optional()
    .isNumeric()
    .withMessage('Pincode must be numeric'),

  body('profile.country')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Country must not exceed 50 characters'),

  body('profile.countryCode')
    .optional()
    .isLength({ min: 2, max: 3 })
    .withMessage('Country code must be 2-3 characters'),

  body('profile.landmark')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Landmark must not exceed 100 characters')
];

// Validation for updating only profile
const validateProfileUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid sub-account ID'),

  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),

  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),

  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),

  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),

  body('age')
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage('Age must be a number between 0 and 150'),

  body('phoneNumber')
    .optional()
    .isNumeric()
    .withMessage('Phone number must be numeric'),

  body('profilePhoto')
    .optional()
    .isURL()
    .withMessage('Profile photo must be a valid URL'),

  body('bannerPhoto')
    .optional()
    .isURL()
    .withMessage('Banner photo must be a valid URL'),

  body('height')
    .optional()
    .isNumeric()
    .withMessage('Height must be numeric'),

  body('weight')
    .optional()
    .isNumeric()
    .withMessage('Weight must be numeric'),

  body('height_unit')
    .optional()
    .isIn(['cm', 'ft', 'in'])
    .withMessage('Height unit must be cm, ft, or in'),

  body('weight_unit')
    .optional()
    .isIn(['kg', 'lbs'])
    .withMessage('Weight unit must be kg or lbs'),

  body('isAthlete')
    .optional()
    .isBoolean()
    .withMessage('isAthlete must be a boolean'),

  body('address')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Address must not exceed 200 characters'),

  body('state')
    .optional()
    .isLength({ max: 50 })
    .withMessage('State must not exceed 50 characters'),

  body('district')
    .optional()
    .isLength({ max: 50 })
    .withMessage('District must not exceed 50 characters'),

  body('pincode')
    .optional()
    .isNumeric()
    .withMessage('Pincode must be numeric'),

  body('country')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Country must not exceed 50 characters'),

  body('countryCode')
    .optional()
    .isLength({ min: 2, max: 3 })
    .withMessage('Country code must be 2-3 characters'),

  body('landmark')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Landmark must not exceed 100 characters')
];

// Validation for bulk operations
const validateBulkSubscription = [
  body('subAccountIds')
    .isArray({ min: 1 })
    .withMessage('subAccountIds must be a non-empty array'),

  body('subAccountIds.*')
    .isMongoId()
    .withMessage('All sub-account IDs must be valid'),

  body('isSubscribed')
    .isBoolean()
    .withMessage('isSubscribed must be a boolean')
];

// Query validation for pagination and filtering
const validateQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('modeSelection')
    .optional()
    .isIn(['Baby Mode', 'Toddler Mode', 'Child Mode', 'Teen Mode', 'Standard Mode', 'Athlete Mode'])
    .withMessage('Invalid mode selection')
];

module.exports = {
  validateSubAccount,
  validateSubAccountUpdate,
  validateProfileUpdate,
  validateBulkSubscription,
  validateQuery
};