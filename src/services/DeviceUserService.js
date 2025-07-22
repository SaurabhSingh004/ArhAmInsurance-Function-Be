const User = require('../models/actofitdeviceUsers');
const mongoose = require('mongoose');
const { logError } = require('../utils/logError');

class DeviceUserService {
    static async getProfile(userId) {
        try {
            const user = await User.findById(userId, { email: 1, profile: 1,isSubscribed: 1, _id: 1 });
            console.log("user",user);
            if(!user) {
                return null;
            }
            return user;
        } catch (error) {
            throw logError('getProfile', error, { userId });
        }
    }
    static async updateUserProfile(userId, updateData) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        // Parse age to integer
        if(updateData.age) {
            updateData.age = parseInt(updateData.age);
        }

        // Validate input data
        if (updateData.age && (typeof updateData.age !== 'number' || updateData.age < 0)) {
            throw new Error('Invalid age value');
        }

        if (updateData.gender && !['male', 'female', 'other'].includes(updateData.gender.toLowerCase())) {
            throw new Error('Invalid gender value');
        }

        try {
            // First, get the existing user data
            const existingUser = await User.findById(userId);
            if (!existingUser) {
                throw new Error('User not found');
            }

            // Profile fields that can be updated
            const allowedProfileFields = [
                'firstName', 'lastName', 'dateOfBirth', 'gender',
                'age', 'phoneNumber', 'profilePhoto', 'bannerPhoto',
                'height', 'weight', 'isAthlete', 'address', 'state',
                'district', 'pincode', 'country', 'countryCode', 'landmark', 'phoneVerificationCode'
            ];

            // Create update object with proper dot notation for nested fields
            const updates = {};

            // Handle profile fields
            allowedProfileFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    // Use dot notation for nested fields
                    updates[`profile.${field}`] = updateData[field];
                } else if (updateData.profile && updateData.profile[field] !== undefined) {
                    updates[`profile.${field}`] = updateData.profile[field];
                }
            });

            // Handle direct fields
            const allowedDirectFields = ['email', 'applicationCode', 'isActive', 'medicalConditions'];
            allowedDirectFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    updates[field] = updateData[field];
                }
            });

            // Add updatedAt timestamp
            updates.updatedAt = new Date();

            console.log("Updates to be applied:", updates);

            // Update the user document using dot notation
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updates },
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!updatedUser) {
                throw new Error('User not found');
            }

            return updatedUser;
        } catch (error) {
            throw logError('updateUserProfile', error, { userId });
        }
    }

    static async toggleBooleanField(userId, fieldName) {
        try {
            // Validate if the field exists and is a boolean in the schema
            const validBooleanFields = [
                'isActive', 'isGoalsResponded', 'isMedicationResponded',
                'isSubscribed', 'isPharmacy', 'isBloodTest', 'isInsurance',
                'isOfflineAccount', 'pendingDeletion', 'profile.isAthlete'
            ];

            if (!validBooleanFields.includes(fieldName)) {
                throw new Error(`Invalid boolean field: ${fieldName}`);
            }

            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            // Handle nested fields (like profile.isAthlete)
            if (fieldName.includes('.')) {
                const [parent, child] = fieldName.split('.');
                if (user[parent]) {
                    user[parent][child] = !user[parent][child];
                } else {
                    throw new Error(`Parent field ${parent} does not exist`);
                }
            } else {
                user[fieldName] = !user[fieldName];
            }

            // Update timestamp
            user.updatedAt = new Date();

            await user.save();
            return user;
        } catch (error) {
            throw error;
        }
    }

    static async searchUsers(filters = {}, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc'){
        try {
          // Validate and prepare sort options
          const validSortFields = [
            'email', 'createdAt', 'updatedAt', 'isAdmin',
            'isPharmacy', 'isBloodTest', 'isInsurance', 'isOfflineAccount', 'isSubscribed'
          ];

          const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
          const sort = {};
          sort[sortField] = sortOrder === 'asc' ? 1 : -1;

          // Calculate skip for pagination
          const skip = (page - 1) * limit;

          // Execute search query with pagination
          const users = await User.find(filters)
            .select('-password -emailVerificationToken -phoneVerificationCode')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

          // Get total count for pagination info
          const totalCount = await User.countDocuments(filters);

          return {
            users,
            totalCount
          };
        } catch (error) {
          console.error('User search service error:', error);
          throw new Error(`Failed to search users: ${error.message}`);
        }
      }
}

module.exports = DeviceUserService;
