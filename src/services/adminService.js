const User = require('../models/userProfile');
const mongoose = require('mongoose');
const { logError } = require('../utils/logError');

class AdminService {

    static async loginUser(credentials) {
        try {
            const { email, password, appName } = credentials;

            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                throw new Error('Invalid credentials');
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                throw new Error('Invalid credentials');
            }

            const { jwtAccessToken } = await this.generateTokens(user);

            if (!user.phoneVerified && appName == "ProHealth") {
                user.phoneVerified = true;
            }

            await user.save();

            const responseData = {
                user: {
                    _id: user._id,
                    email: user.email,
                    isMedicationResponded: user?.isMedicationResponded,
                    isGoalsResponded: user?.isGoalsResponded,
                    isSubscribed: user?.isSubscribed,
                    isAdmin: user?.isAdmin,
                    emailVerified: user.emailVerified,
                    phoneVerified: user.phoneVerified,
                    profile: user.profile,
                },
                userFeature: {
                    isPharmacy: user?.isPharmacy,
                    isInsurance: user?.isInsurance,
                    isBloodTest: user?.isBloodTest,
                    isOfflineAccount: user?.isOfflineAccount,
                },
                token: jwtAccessToken
            };

            return {
                responseData
            };
        } catch (error) {
            throw logError('loginUser', error, { email: credentials.email });
        }
    }
    // Combined User Service Method(data and togglefields)
    static async updateUserWithToggle(userId, updateData = {}, togglekey = null) {
        if (!userId) throw new Error('User ID is required');

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const updates = {};

        // Handle togglekey
        if (togglekey) {
            const validBooleanFields = [
                'isActive', 'isGoalsResponded', 'isMedicationResponded',
                'isSubscribed', 'isPharmacy', 'isBloodTest', 'isInsurance',
                'isOfflineAccount', 'pendingDeletion', 'profile.isAthlete'
            ];

            if (!validBooleanFields.includes(togglekey)) {
                throw new Error(`Invalid boolean field: ${togglekey}`);
            }

            if (togglekey.includes('.')) {
                const [parent, child] = togglekey.split('.');
                if (user[parent]) {
                    updates[`${parent}.${child}`] = !user[parent][child];
                } else {
                    throw new Error(`Parent field ${parent} does not exist`);
                }
            } else {
                updates[togglekey] = !user[togglekey];
            }
        }

        // Handle updateData
        if (Object.keys(updateData).length > 0) {
            if (updateData.age) {
                updateData.age = parseInt(updateData.age);
            }

            if (updateData.age && (typeof updateData.age !== 'number' || updateData.age < 0)) {
                throw new Error('Invalid age value');
            }

            if (updateData.gender && !['male', 'female', 'other'].includes(updateData.gender.toLowerCase())) {
                throw new Error('Invalid gender value');
            }

            const allowedProfileFields = [
                'firstName', 'lastName', 'dateOfBirth', 'gender',
                'age', 'phoneNumber', 'profilePhoto', 'bannerPhoto',
                'height', 'weight', 'isAthlete', 'address', 'state',
                'district', 'pincode', 'country', 'countryCode', 'landmark', 'phoneVerificationCode'
            ];

            const allowedDirectFields = ['email', 'applicationCode', 'isActive', 'medicalConditions'];

            allowedProfileFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    updates[`profile.${field}`] = updateData[field];
                } else if (updateData.profile && updateData.profile[field] !== undefined) {
                    updates[`profile.${field}`] = updateData.profile[field];
                }
            });

            allowedDirectFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    updates[field] = updateData[field];
                }
            });
        }

        updates.updatedAt = new Date();

        const updatedUser = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true });
        return updatedUser;
    }
    static async deleteUserByAdmin(ids) {
        try {
            // Validate IDs
            if (!Array.isArray(ids)) {
                throw new Error('User IDs must be provided as an array');
            }

            // Delete users
            const result = await User.deleteMany({ _id: { $in: ids } });
            return result;
        } catch (error) {
            throw logError('deleteUserByAdmin', error, { ids });
        }
    }
    static async searchUsers(filters = {}, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc') {
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

module.exports = AdminService;
