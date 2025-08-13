const User = require('../models/userProfile');
const { logError } = require('../utils/logError');
const AdminService = require('../services/adminService');

class AdminController {

    getUserById = async (request, context) => {

        try {

            const userId = request.params.id || {};

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
    getAllUsers = async (request, context) => {
        try {

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
    deleteUserByAdmin = async (request, context) => {
        try {
            const { userIds } = await request.json() || {};

            // Validate request body
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Please provide a valid array of user IDs'
                    }
                };
            }

            // Call service method to delete users
            const result = await AdminService.deleteUserByAdmin(userIds);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: {
                        deletedCount: result.deletedCount,
                        acknowledged: result.acknowledged
                    },
                    message: result.deletedCount > 0
                        ? `Successfully deleted ${result.deletedCount} user(s)`
                        : 'No users were deleted'
                }
            };
        } catch (error) {
            const err = logError('deleteUserByAdmin', error, {});
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'An error occurred while deleting users'
                }
            };
        }
    }
    updateOrToggleProfile = async (request, context) => {
        try {
            const { userId, togglekey, ...updateData } = await request.json() || {};

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: { message: "User ID is required" }
                };
            }

            if (!togglekey && Object.keys(updateData).length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'No update data or toggle key provided'
                    }
                };
            }

            const updatedUser = await AdminService.updateUserWithToggle(userId, updateData, togglekey);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: updatedUser,
                    message: `User updated successfully${togglekey ? ` and field ${togglekey} toggled` : ''}`
                }
            };
        } catch (error) {
            const err = logError('updateOrToggleProfile', error, { userId: context.user?._id });
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
    searchUsers = async (request, context) => {
        try {
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

            // Search by email, first name, or last name(for general search for all bar)
            if (q) {
                filters.$or = [
                    { email: { $regex: `.*${q}.*`, $options: 'i' } },
                    { 'profile.firstName': { $regex: `.*${q}.*`, $options: 'i' } },
                    { 'profile.lastName': { $regex: `.*${q}.*`, $options: 'i' } }
                ];
            }

            // Search by first name and last name(specifically prob to filter)
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

            const result = await AdminService.searchUsers(
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
    loginUser = async (request, context) => {
        try {
            // Authenticate user using AdminService
            const { responseData } = await AdminService.loginUser(await request.json() || {});

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: responseData,
                    message: 'Login successful'
                }
            };
        } catch (error) {
            const err = logError('loginUser', error, {});
            return {
                status: 401,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new AdminController();