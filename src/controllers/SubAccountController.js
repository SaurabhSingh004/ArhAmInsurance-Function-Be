const subAccountService = require('../services/subAccountService');
const { validationResult } = require('express-validator');
const {logError} = require('../utils/logError');

class SubAccountController {

    createSubAccount = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            // Check for validation errors
            const errors = validationResult(request);
            if (!errors.isEmpty()) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Validation errors',
                        errors: errors.array()
                    }
                };
            }

            const subAccountData = {
                ...(await request.json() || {}),
                owner: userId
            };
            context.log('Create Subaccount Data:', subAccountData);

            const subAccount = await subAccountService.createSubAccount(subAccountData);
            
            return {
                status: 201,
                jsonBody: {
                    success: true,
                    message: 'Sub-account created successfully',
                    data: subAccount
                }
            };
        } catch (error) {
            context.error('Error creating sub-account:', error);
            const err = logError('createSubAccount', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to create sub-account'
                }
            };
        }
    }

    getSubAccounts = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { page = 1, limit = 10, modeSelection } = request.query || {};
            
            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                modeSelection
            };

            const result = await subAccountService.getSubAccountsByOwner(userId, options);
            context.log('Sub-accounts retrieved:', result.subAccounts);
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Sub-accounts retrieved successfully',
                    data: result.subAccounts,
                    pagination: {
                        currentPage: result.currentPage,
                        totalPages: result.totalPages,
                        totalCount: result.totalCount,
                        hasNextPage: result.hasNextPage,
                        hasPrevPage: result.hasPrevPage
                    }
                }
            };
        } catch (error) {
            context.error('Error fetching sub-accounts:', error);
            const err = logError('getSubAccounts', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to fetch sub-accounts'
                }
            };
        }
    }

    getSubAccountById = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { id } = request.params || {};

            const subAccount = await subAccountService.getSubAccountById(id, userId);
            context.log('Sub-account retrieved:', subAccount);
            
            if (!subAccount) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'Sub-account not found'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Sub-account retrieved successfully',
                    data: subAccount
                }
            };
        } catch (error) {
            context.error('Error fetching sub-account:', error);
            const err = logError('getSubAccountById', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to fetch sub-account'
                }
            };
        }
    }

    updateSubAccount = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            // Check for validation errors
            const errors = validationResult(request);
            if (!errors.isEmpty()) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Validation errors',
                        errors: errors.array()
                    }
                };
            }

            const { id } = request.params || {};
            const updateData = await request.json() || {};
            context.log('Update Subaccount Data:', updateData);
            
            const updatedSubAccount = await subAccountService.updateSubAccount(id, userId, updateData);
            
            if (!updatedSubAccount) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'Sub-account not found'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Sub-account updated successfully',
                    data: updatedSubAccount
                }
            };
        } catch (error) {
            context.error('Error updating sub-account:', error);
            const err = logError('updateSubAccount', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to update sub-account'
                }
            };
        }
    }

    deleteSubAccount = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { id } = request.params || {};

            const deletedSubAccount = await subAccountService.deleteSubAccount(id, userId);
            
            if (!deletedSubAccount) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'Sub-account not found'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Sub-account deleted successfully'
                }
            };
        } catch (error) {
            context.error('Error deleting sub-account:', error);
            const err = logError('deleteSubAccount', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to delete sub-account'
                }
            };
        }
    }

    updateSubAccountProfile = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const errors = validationResult(request);
            if (!errors.isEmpty()) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Validation errors',
                        errors: errors.array()
                    }
                };
            }

            const { id } = request.params || {};
            const profileData = await request.json() || {};

            const updatedSubAccount = await subAccountService.updateSubAccountProfile(id, userId, profileData);
            
            if (!updatedSubAccount) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'Sub-account not found'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Sub-account profile updated successfully',
                    data: updatedSubAccount
                }
            };
        } catch (error) {
            context.error('Error updating sub-account profile:', error);
            const err = logError('updateSubAccountProfile', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to update sub-account profile'
                }
            };
        }
    }

    getSubAccountsByMode = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { modeSelection } = request.params || {};
            const { page = 1, limit = 10 } = request.query || {};

            const options = {
                page: parseInt(page),
                limit: parseInt(limit)
            };

            const result = await subAccountService.getSubAccountsByMode(userId, modeSelection, options);
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: `Sub-accounts in ${modeSelection} retrieved successfully`,
                    data: result.subAccounts,
                    pagination: {
                        currentPage: result.currentPage,
                        totalPages: result.totalPages,
                        totalCount: result.totalCount,
                        hasNextPage: result.hasNextPage,
                        hasPrevPage: result.hasPrevPage
                    }
                }
            };
        } catch (error) {
            context.error('Error fetching sub-accounts by mode:', error);
            const err = logError('getSubAccountsByMode', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to fetch sub-accounts by mode'
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new SubAccountController();