const User = require('../models/userProfile');
const userService = require('../services/UserService');
const {logError} = require('../utils/logError');

class UserController {

    getUserRespondedInfo = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }
            
            const result = await User.findById(userId);
            return {
                status: 200,
                jsonBody: {
                    code: 1,
                    msg: "User Info fetched Successfully",
                    data: result
                }
            };
        } catch (error) {
            const err = logError('getUserRespondedInfo', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    code: 0,
                    msg: "ERROR",
                    error: err.message
                }
            };
        }
    }

    getUserData = async (request, context) => {
        try {
            const { userId } = request.params || {};
            
            if (!userId) {
                return {
                    status: 400,
                    jsonBody: {
                        code: 0,
                        msg: "User ID is required"
                    }
                };
            }
            
            const result = await User.findById(userId);
            return {
                status: 200,
                jsonBody: {
                    code: 1,
                    msg: "User Info fetched Successfully",
                    data: result
                }
            };
        } catch (error) {
            const err = logError('getUserData', error, { userId: request.params?.userId });
            return {
                status: 500,
                jsonBody: {
                    code: 0,
                    msg: "ERROR",
                    error: err.message
                }
            };
        }
    }

    getProfile = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const user = await userService.getProfile(userId);
            if (!user) {
                return {
                    status: 200,
                    jsonBody: {
                        success: false,
                        message: 'No User Found.',
                        data: {}
                    }
                };
            }
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Profile fetched successfully',
                    data: user
                }
            };
        } catch (error) {
            const err = logError('getProfile', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Error fetching profile'
                }
            };
        }
    }

    getAllUsers = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { page = 1, limit = 10, email, isSubscribed } = request.query || {};
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const filterOptions = {};
            filterOptions.profile = { $exists: true };

            if (email) {
                filterOptions.email = { $regex: email, $options: 'i' };
            }

            if (isSubscribed !== undefined) {
                filterOptions.isSubscribed = isSubscribed === 'true';
            }

            const totalUsers = await User.countDocuments(filterOptions);

            const users = await User.find(filterOptions)
                .select('_id email isSubscribed profile isPharmacy isInsurance isOfflineAccount isBloodTest')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            if (users.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'No users found'
                    }
                };
            }

            const totalPages = Math.ceil(totalUsers / parseInt(limit));

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Users retrieved successfully',
                    data: users,
                    pagination: {
                        totalUsers,
                        totalPages,
                        currentPage: parseInt(page),
                        limit: parseInt(limit),
                        hasNextPage: parseInt(page) < totalPages,
                        hasPrevPage: parseInt(page) > 1
                    }
                }
            };
        } catch (error) {
            const err = logError('getAllUsers', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error fetching users',
                    error: err.message
                }
            };
        }
    }

    toggleUserBooleanField = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { togglekey, userId: targetUserId } = await request.json() || {};

            if (!togglekey) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Field name is required'
                    }
                };
            }

            const updatedUser = await userService.toggleBooleanField(targetUserId, togglekey);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: updatedUser,
                    message: `Field ${togglekey} toggled successfully`
                }
            };
        } catch (error) {
            const err = logError('toggleUserBooleanField', error, { userId: context.user?._id });
            const statusCode = err.message.includes('not found') ? 404 : 400;
            return {
                status: statusCode,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    updateProfile = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const updateData = await request.json() || {};

            if (Object.keys(updateData).length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'No update data provided'
                    }
                };
            }

            const updatedUser = await userService.updateUserProfile(userId, updateData);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: updatedUser,
                    message: 'Profile updated successfully'
                }
            };
        } catch (error) {
            const err = logError('updateProfile', error, { userId: context.user?._id });
            const statusCode = err.message.includes('not found') ? 404 : 500;
            return {
                status: statusCode,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    searchSubscribedUser = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const {
                q,
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = request.query || {};

            const filters = {};

            if (q) {
                filters.$or = [
                    { email: { $regex: `.*${q}.*`, $options: 'i' } },
                    { 'profile.firstName': { $regex: `.*${q}.*`, $options: 'i' } },
                    { 'profile.lastName': { $regex: `.*${q}.*`, $options: 'i' } }
                ];
            }
            filters.isSubscribed = true;
            
            const result = await userService.searchUsers(
                filters,
                parseInt(page),
                parseInt(limit),
                sortBy,
                sortOrder
            );

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Subscriptions retrieved successfully',
                    data: result.users,
                }
            };
        } catch (error) {
            const err = logError('searchSubscribedUser', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to search users',
                    error: err.message
                }
            };
        }
    }

    searchUsers = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const {
                q,
                firstName,
                lastName,
                isAdmin,
                isPharmacy,
                isBloodTest,
                isInsurance,
                isOfflineAccount,
                isSubscribed,
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                startDate,
                endDate,
                dateField = 'createdAt'
            } = request.query || {};

            const filters = {};

            if (q) {
                filters.$or = [
                    { email: { $regex: `.*${q}.*`, $options: 'i' } },
                    { 'profile.firstName': { $regex: `.*${q}.*`, $options: 'i' } },
                    { 'profile.lastName': { $regex: `.*${q}.*`, $options: 'i' } }
                ];
            }
            
            if (firstName) filters['profile.firstName'] = { $regex: firstName, $options: 'i' };
            if (lastName) filters['profile.lastName'] = { $regex: lastName, $options: 'i' };
            
            const startDateObj = startDate ? new Date(startDate) : null;
            const endDateObj = endDate ? new Date(endDate) : null;
            const dateFieldName = dateField === 'updatedAt' ? 'updatedAt' : 'createdAt';
            
            if (startDateObj || endDateObj) {
                filters[dateFieldName] = {};
                
                if (startDateObj) {
                    filters[dateFieldName].$gte = startDateObj;
                }
                
                if (endDateObj) {
                    const nextDay = new Date(endDateObj);
                    nextDay.setDate(nextDay.getDate() + 1);
                    filters[dateFieldName].$lt = nextDay;
                }
            }

            if (isAdmin !== undefined) filters.isAdmin = isAdmin === 'true';
            if (isPharmacy !== undefined) filters.isPharmacy = isPharmacy === 'true';
            if (isBloodTest !== undefined) filters.isBloodTest = isBloodTest === 'true';
            if (isInsurance !== undefined) filters.isInsurance = isInsurance === 'true';
            if (isOfflineAccount !== undefined) filters.isOfflineAccount = isOfflineAccount === 'true';
            if (isSubscribed !== undefined) filters.isSubscribed = isSubscribed === 'true';

            const result = await userService.searchUsers(
                filters,
                parseInt(page),
                parseInt(limit),
                sortBy,
                sortOrder
            );

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Users retrieved successfully',
                    data: result.users,
                    pagination: {
                        total: result.totalCount,
                        page: parseInt(page),
                        pages: Math.ceil(result.totalCount / parseInt(limit)),
                        limit: parseInt(limit)
                    }
                }
            };
        } catch (error) {
            const err = logError('searchUsers', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to search users',
                    error: err.message
                }
            };
        }
    }

    getSubscribedUsersWithPagination = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const {
                page = 1,
                limit = 10,
                startDate,
                endDate,
                dateField = 'SubscriptionDate',
                q,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = request.query || {};

            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const startDateObj = startDate ? new Date(startDate) : null;
            const endDateObj = endDate ? new Date(endDate) : null;
            const dateFieldName = dateField === 'updatedAt' ? 'SubscriptionDate' : 'SubscriptionDate';
            
            const filters = {};
    
            if (q) {
                filters.$or = [
                    { email: { $regex: `.*${q}.*`, $options: 'i' } },
                    { 'profile.firstName': { $regex: `.*${q}.*`, $options: 'i' } },
                    { 'profile.lastName': { $regex: `.*${q}.*`, $options: 'i' } }
                ];
            }
            
            if (startDateObj || endDateObj) {
                filters[dateFieldName] = {};
                
                if (startDateObj) {
                    filters[dateFieldName].$gte = startDateObj;
                }
                
                if (endDateObj) {
                    const nextDay = new Date(endDateObj);
                    nextDay.setDate(nextDay.getDate() + 1);
                    filters[dateFieldName].$lt = nextDay;
                }
            }
            
            filters.isSubscribed = true;
            
            const validSortFields = [
                'email', 'createdAt', 'updatedAt', 'isAdmin', 'isSubscribed'
            ];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
            const sort = {};
            sort[sortField] = sortOrder === 'asc' ? 1 : -1;
            
            const subscribedUsers = await User.find(filters)
                .select('_id email profile.firstName profile.lastName SubscriptionDate createdAt updatedAt couponCode')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit));
            
            const total = await User.countDocuments(filters);
            
            const transformedUsers = subscribedUsers.map(user => {
                const userObj = user.toObject ? user.toObject() : user;
                
                const firstName = userObj.profile?.firstName || '';
                const lastName = userObj.profile?.lastName || '';
                const username = `${firstName} ${lastName}`.trim();
                
                const coupon = userObj.couponCode && userObj.couponCode.trim() ? userObj.couponCode : null;
                const couponLabel = coupon ? `Coupon: ${coupon}` : 'No coupon applied';
                
                return {
                    _id: userObj._id,
                    email: userObj.email,
                    username: username,
                    firstName: userObj.profile?.firstName,
                    lastName: userObj.profile?.lastName,
                    SubscriptionDate: userObj.SubscriptionDate,
                    createdAt: userObj.createdAt,
                    updatedAt: userObj.updatedAt,
                    coupon: userObj.couponCode || '',
                    couponLabel: userObj.couponLabel || couponLabel,
                };
            });
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    count: transformedUsers.length,
                    totalPages: Math.ceil(total / parseInt(limit)),
                    currentPage: parseInt(page),
                    totalUsers: total,
                    data: transformedUsers
                }
            };
        } catch (error) {
            const err = logError('getSubscribedUsersWithPagination', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Server error while fetching subscribed users',
                    error: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new UserController();