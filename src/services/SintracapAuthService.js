// services/SintraCapauthService.js
const jwt = require('jsonwebtoken');
const User = require('../models/sintracapUser');
const AuthService = require('../services/AuthService');
const userProfile = require('../models/userProfile');
class SintraCapAuthService {

  /**
   * Check if email is available (not already registered)
   * @param {string} email - User email
   * @returns {Promise<boolean>} - True if email is available
   */
  static async isEmailAvailable(email) {
    const existingUser = await User.findOne({ email });
    if(!existingUser) {
        return false;
    }
    return true;
  }

  static async getUsersByRole(role) {
    if (!['investor', 'founder'].includes(role)) {
      throw new Error('Invalid role specified. Valid roles are "investor" and "founder".');
    }

    const users = await User.getUsersByRole(role);
    if (!users || users.length === 0) {
      throw new Error(`No ${role}s found.`);
    }

    return users;
  }
  
  static async getUserRole(userId) {
    const user = await User.findById(userId);
    if(!user) {
        throw new Error('User not found');
    }
    return user.role;
  }
  
  /**
   * Check if a pre-signup entry exists for the email
   * @param {string} email - User email
   * @returns {Promise<boolean>} - True if pre-signup exists
   */
  static async preSignupExists(email) {
    const preSignupUser = await User.findOne({ 
      email, 
      signupStatus: 'pre-signup' 
    });

    return !!preSignupUser;
  }

  /**
   * Create a pre-signup user entry
   * @param {Object} userData - User data
   * @returns {Promise<void>}
   */
  static async createPreSignupUser(userData) {
    const { email, password, name, phone, agreedToTerms } = userData;
    
    // Create pre-signup entry
    const preSignupUser = new User({
      email,
      password,
      name,
      phone,
      agreedToTerms,
      signupStatus: 'pre-signup',
      // expiresAt will be set by default in the schema
    });
    
    await preSignupUser.save();
  }

  /**
   * Update user with investor role and profile data
   * @param {string} email - User email
   * @param {Object} profileData - Investor profile data
   * @returns {Promise<Object>} - Result object
   */
  static async createInvestorProfile(email, profileData) {
    const { interests, investmentPreferences, amountRange } = profileData;
    
    const user = await User.findOne({ email, signupStatus: 'pre-signup' });
    if (!user) {
      throw new Error('Pre-signup user not found');
    }
    
    // Update user with investor-specific data
    user.role = 'investor';
    user.interests = interests;
    user.amountRange = amountRange;
    user.investmentPreferences = investmentPreferences || {};
    user.signupStatus = 'role-selected';
    user.expiresAt = undefined; // Remove expiration
    
    await user.save();
    
    return { status: 'success'};
  }

  /**
   * Update user with founder role and profile data
   * @param {string} email - User email
   * @param {Object} profileData - Founder profile data
   * @returns {Promise<Object>} - Result object
   */
  static async createFounderProfile(email, profileData) {
    const { startupName, startupCategory, startupDescription, industry, fundingStage, teamSize } = profileData;
    
    const user = await User.findOne({ email, signupStatus: 'pre-signup' });
    if (!user) {
      throw new Error('Pre-signup user not found');
    }
    
    // Update user with founder-specific data
    user.role = 'founder';
    user.startupName = startupName;
    user.startupDescription = startupDescription;
    user.industry = industry;
    user.fundingStage = fundingStage;
    user.startupCategory = startupCategory;
    user.teamSize = teamSize;
    user.signupStatus = 'role-selected';
    user.expiresAt = undefined; // Remove expiration
    
    await user.save();
    
    return { status: 'success'};
  }

  /**
   * Finalize signup by completing the user account
   * @param {string} email - User email
   * @returns {Promise<Object>} - Result object with token
   */
  static async finalizeSignup(email) {
    // Find user with role-selected status
    const user = await User.findOne({ 
      email, 
      signupStatus: 'role-selected' 
    });
    if (!user) {
      throw new Error('User not found or signup not yet completed');
    }
    
    // Update signup status to complete
    user.signupStatus = 'complete';
    await user.save();
    
    // Generate JWT token
    const { jwtAccessToken } = await AuthService.generateTokens(user);
    return {
      status: 'success',
      userId: user._id,
      username: user.name,
      jwtAccessToken: jwtAccessToken
    };
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object|null>} - Login result or null if invalid
   */
  static async login(email, password) {
    // Find user by email with complete signup status
    const user = await User.findOne({ 
      email, 
      signupStatus: 'complete' 
    });
    
    if (!user) {
      return null;
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return null;
    }
    
    // Generate token
    const { jwtAccessToken } = await AuthService.generateTokens(user);
    
    return {
      userId: user._id,
      jwtAccessToken: jwtAccessToken,
      role: user.role,
      name: user.name,
      email: user.email
    };
  }
  static async getInvestorDashboard(userId) {
    // Find the investor user
    const investor = await User.findOne({
      _id: userId,
      role: 'investor',
      signupStatus: 'complete'
    });

    if (!investor) {
      throw new Error('Investor not found');
    }

    return {
      user: {
        name: investor.name,
        email: investor.email,
        interests: investor.interests,
        investmentPreferences: investor.investmentPreferences,
        isVerified: investor.isVerifiedByAdmin
      }
    };
  }

  /**
   * Get the dashboard data for a founder based on their profile
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Dashboard data
   */
  static async getFounderDashboard(userId) {
    // Find the founder user
    const founder = await User.findOne({
      _id: userId,
      role: 'founder',
      signupStatus: 'complete'
    });

    if (!founder) {
      throw new Error('Founder not found');
    }

    return {
      user: {
        name: founder.name,
        email: founder.email,
        startupName: founder.startupName || 'Your Startup',
        startupDescription: founder.startupDescription,
        industry: founder.industry,
        fundingStage: founder.fundingStage,
        amountRange: founder.amountRange,
        startupCategory: founder.startupCategory,
        teamSize: founder.teamSize,
        isVerified: founder.isVerifiedByAdmin
      }
    };
  }

  static async updateVerificationStatus(id, isVerifiedByAdmin) {
    try {
      // Check if investor exists
      const investor = await User.findById(id);
      
      if (!investor) {
        throw new Error('User not found');
      }
      
      // Update verification status
      investor.isVerifiedByAdmin = isVerifiedByAdmin;
      
      // Add verification timestamp if being verified
      if (isVerifiedByAdmin) {
        investor.verifiedAt = new Date();
      } else {
        investor.verifiedAt = null;
      }
      
      // Save the updated investor
      await investor.save();
      
      // Return the updated investor
      return investor;
    } catch (error) {
      throw new Error('Server Error');
    }
  };
}

module.exports = SintraCapAuthService;