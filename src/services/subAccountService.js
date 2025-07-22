// services/subAccountService.js
const SubAccount = require('../models/subProfiles');
const mongoose = require('mongoose');

class SubAccountService {
  // Create a new sub-account
  async createSubAccount(subAccountData) {
    try {
      // Validate required fields
      if (!subAccountData.profile) {
        throw new Error('Profile data is required');
      }

      const subAccount = new SubAccount(subAccountData);
      const savedSubAccount = await subAccount.save();

      // Populate owner information
      await savedSubAccount.populate('owner', 'firstName lastName email');

      return savedSubAccount;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }
      throw error;
    }
  }

  // Get all sub-accounts for a specific owner with pagination
  async getSubAccountsByOwner(ownerId, options = {}) {
    try {
      const { page = 1, limit = 10, modeSelection } = options;
      const skip = (page - 1) * limit;

      // Build query
      const query = { owner: ownerId };
      if (modeSelection) {
        query.modeSelection = modeSelection;
      }

      // Get total count for pagination
      const totalCount = await SubAccount.countDocuments(query);

      // Get paginated results
      const subAccounts = await SubAccount.find(query)
        .populate('owner', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        subAccounts,
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage
      };
    } catch (error) {
      throw error;
    }
  }

  async getFirstSubAccountByOwner(ownerId, options = {}) {
  try {
    const { modeSelection } = options;

    // Build query
    const query = { owner: ownerId };
    if (modeSelection) {
      query.modeSelection = modeSelection;
    }

    // Get only 1 sub-account (no pagination needed)
    const subAccount = await SubAccount.findOne(query)
      .populate('owner', 'firstName lastName email')
      .sort({ createdAt: -1 }) // -1 = latest first, 1 = oldest first
      .lean();

    return subAccount; // Returns null if not found
  } catch (error) {
    throw error;
  }
}

  // Get a specific sub-account by ID and owner
  async getSubAccountById(subAccountId, ownerId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(subAccountId)) {
        throw new Error('Invalid sub-account ID');
      }

      const subAccount = await SubAccount.findOne({
        _id: subAccountId,
        owner: ownerId
      }).populate('owner', 'firstName lastName email');

      return subAccount;
    } catch (error) {
      throw error;
    }
  }

  // Update a sub-account
  async updateSubAccount(subAccountId, ownerId, updateData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(subAccountId)) {
        throw new Error('Invalid sub-account ID');
      }

      // Remove owner from updateData to prevent unauthorized changes
      delete updateData.owner;

      const updatedSubAccount = await SubAccount.findOneAndUpdate(
        { _id: subAccountId, owner: ownerId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate('owner', 'firstName lastName email');

      return updatedSubAccount;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }
      throw error;
    }
  }

  // Delete a sub-account
  async deleteSubAccount(subAccountId, ownerId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(subAccountId)) {
        throw new Error('Invalid sub-account ID');
      }

      const deletedSubAccount = await SubAccount.findOneAndDelete({
        _id: subAccountId,
        owner: ownerId
      });

      return deletedSubAccount;
    } catch (error) {
      throw error;
    }
  }

  // Update only the profile section of a sub-account
  async updateSubAccountProfile(subAccountId, ownerId, profileData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(subAccountId)) {
        throw new Error('Invalid sub-account ID');
      }

      // Create update object for profile fields
      const updateObject = {};
      Object.keys(profileData).forEach(key => {
        updateObject[`profile.${key}`] = profileData[key];
      });

      const updatedSubAccount = await SubAccount.findOneAndUpdate(
        { _id: subAccountId, owner: ownerId },
        { $set: updateObject },
        { new: true, runValidators: true }
      ).populate('owner', 'firstName lastName email');

      return updatedSubAccount;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }
      throw error;
    }
  }

  // Get sub-accounts by mode selection
  async getSubAccountsByMode(ownerId, modeSelection, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const query = {
        owner: ownerId,
        modeSelection: modeSelection
      };

      const totalCount = await SubAccount.countDocuments(query);

      const subAccounts = await SubAccount.find(query)
        .populate('owner', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        subAccounts,
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage
      };
    } catch (error) {
      throw error;
    }
  }

  // Get all sub-accounts (admin function)
  async getAllSubAccounts(options = {}) {
    try {
      const { page = 1, limit = 10, ownerId, modeSelection } = options;
      const skip = (page - 1) * limit;

      // Build query
      const query = {};
      if (ownerId) query.owner = ownerId;
      if (modeSelection) query.modeSelection = modeSelection;

      const totalCount = await SubAccount.countDocuments(query);

      const subAccounts = await SubAccount.find(query)
        .populate('owner', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        subAccounts,
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage
      };
    } catch (error) {
      throw error;
    }
  }

  // Get sub-account statistics
  async getSubAccountStats(ownerId) {
    try {
      const stats = await SubAccount.aggregate([
        { $match: { owner: mongoose.Types.ObjectId(ownerId) } },
        {
          $group: {
            _id: '$modeSelection',
            count: { $sum: 1 },
            subscribedCount: {
              $sum: { $cond: ['$isSubscribed', 1, 0] }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalSubAccounts: { $sum: '$count' },
            totalSubscribed: { $sum: '$subscribedCount' },
            modeBreakdown: {
              $push: {
                mode: '$_id',
                count: '$count',
                subscribedCount: '$subscribedCount'
              }
            }
          }
        }
      ]);

      return stats[0] || {
        totalSubAccounts: 0,
        totalSubscribed: 0,
        modeBreakdown: []
      };
    } catch (error) {
      throw error;
    }
  }

  // Bulk update subscription status
  async bulkUpdateSubscription(ownerId, subAccountIds, isSubscribed) {
    try {
      const validIds = subAccountIds.filter(id => mongoose.Types.ObjectId.isValid(id));

      const result = await SubAccount.updateMany(
        {
          _id: { $in: validIds },
          owner: ownerId
        },
        { $set: { isSubscribed: isSubscribed } }
      );

      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new SubAccountService();