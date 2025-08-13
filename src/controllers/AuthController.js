const AuthService = require('../services/AuthService');
const { logError } = require('../utils/logError');

class AuthController {

    registerUser = async (request, context) => {
        try {
            // Register the user using AuthService
            const { responseData } = await AuthService.registerUser(await request.json() || {});

            return {
                status: 201,
                jsonBody: {
                    success: true,
                    data: responseData,
                    message: 'User registered successfully'
                }
            };
        } catch (error) {
            const err = logError('registerUser', error);
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    createUser = async (request, context) => {
        try {
            // Register the user using AuthService
            const { responseData } = await AuthService.createAccount(await request.json() || {});

            return {
                status: 201,
                jsonBody: {
                    success: true,
                    data: responseData,
                    message: 'User registered successfully'
                }
            };
        } catch (error) {
            const err = logError('createUser', error, { });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    loginUser = async (request, context) => {
        try {
            // Authenticate user using AuthService
            const { responseData } = await AuthService.loginUser(await request.json() || {});

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: responseData,
                    message: 'Login successful'
                }
            };
        } catch (error) {
            const err = logError('loginUser', error, { });
            return {
                status: 401,
                jsonBody: {
                    success: false,
                    message: err.message
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
            const result = await AuthService.deleteUserByAdmin(userIds);

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
            const err = logError('deleteUserByAdmin', error, { });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'An error occurred while deleting users'
                }
            };
        }
    }

    verifyEmail = async (request, context) => {
        try {
            const { token } = request.params || {};

            if (!token) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Verification token is required'
                    }
                };
            }

            const result = await AuthService.verifyEmail(token);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Email verified successfully'
                }
            };
        } catch (error) {
            const err = logError('verifyEmail', error, { token: request.params?.token });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message || 'Email verification failed'
                }
            };
        }
    }

    verifyPhone = async (request, context) => {
        try {
            const reqData = await request.json();
            const { phone, code } = reqData || {};

            if (!phone || !code) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Phone number and verification code are required'
                    }
                };
            }

            const result = await AuthService.verifyPhone(phone, code);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Phone verified successfully'
                }
            };
        } catch (error) {
            const err = logError('verifyPhone', error, { phone: reqData?.phone });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message || 'Phone verification failed'
                }
            };
        }
    }

    resendVerification = async (request, context) => {
        try {
            const { type } = request.query || {}; // 'email' or 'phone'
            const userId = context.user?._id; // Assuming authenticated route

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            if (!type || !['email', 'phone'].includes(type)) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Valid verification type (email or phone) is required'
                    }
                };
            }

            const result = await AuthService.resendVerification(userId, type);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: `Verification ${type === 'email' ? 'email' : 'SMS'} sent successfully`
                }
            };
        } catch (error) {
            const err = logError('resendVerification', error, {
                userId: context.user?._id,
                type: request.query?.type
            });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to resend verification'
                }
            };
        }
    }

    changePassword = async (request, context) => {
        try {
            const userId = context.user?._id;

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            await AuthService.changePassword(userId, await request.json() || {});

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Password changed successfully'
                }
            };
        } catch (error) {
            const err = logError('changePassword', error, { userId: context.user?._id });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    googleCallback = async (request, context) => {
        try {
            const result = await AuthService.handleGoogleCallback(await request.json() || {});

            // Customize message if account was reactivated
            const message = result.user.wasReactivated
                ? 'Google SignIn Successful. Your account has been reactivated.'
                : 'Google SignIn Successful';

            // Remove the wasReactivated flag from the response to the client
            delete result.user.wasReactivated;

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: message,
                    data: result
                }
            };
        } catch (error) {
            const err = logError('googleCallback', error);
            return {
                status: 401,
                jsonBody: {
                    success: false,
                    message: err.message || 'Google sign-in failed'
                }
            };
        }
    }

    appleCallback = async (request, context) => {
        try {
            const payload = await request.json();
            context.log("Apple Payload", payload);

            const result = await AuthService.handleAppleCallback( payload , context);

            // Customize message if account was reactivated
            const message = result.user.wasReactivated
                ? 'Apple SignIn Successful. Your account has been reactivated.'
                : 'Apple SignIn Successful';

            // Remove the wasReactivated flag from the response to the client
            delete result.user.wasReactivated;

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: message,
                    data: result
                }
            };
        } catch (error) {
            const err = logError('appleCallback', error);
            return {
                status: 401,
                jsonBody: {
                    success: false,
                    message: err.message || 'Apple sign-in failed'
                }
            };
        }
    }

    metaCallback = async (request, context) => {
        try {
            const result = await AuthService.handleMetaCallback(await request.json() || {});

            // Customize message if account was reactivated
            const message = result.user.wasReactivated
                ? 'Meta SignIn Successful. Your account has been reactivated.'
                : 'Meta SignIn Successful';

            // Remove the wasReactivated flag from the response to the client
            delete result.user.wasReactivated;

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: message,
                    data: result
                }
            };
        } catch (error) {
            const err = logError('metaCallback', error);
            return {
                status: 401,
                jsonBody: {
                    success: false,
                    message: err.message || 'Meta sign-in failed'
                }
            };
        }
    }

    verifyToken = async (request, context) => {
        try {
            const token = request.headers?.authorization?.split(' ')[1];
            const result = await AuthService.verifyToken(token);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result
                }
            };
        } catch (error) {
            const err = logError('verifyToken', error);
            return {
                status: 401,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    resetPasswordRequest = async (request, context) => {
        try {
            const { email } = await request.json() || {};
            const token = await AuthService.resetPasswordRequest(email);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    token: token,
                    message: 'Password reset email sent'
                }
            };
        } catch (error) {
            const err = logError('resetPasswordRequest', error);
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    verifyResetToken = async (request, context) => {
        try {
            const { email, token } = await request.json() || {};
            await AuthService.verifyResetToken(email, token);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    tokenValidated: true,
                    message: 'Reset token is valid',
                }
            };
        } catch (error) {
            // Log the error under the 'verifyResetToken' context
            const err = logError('verifyResetToken', error);
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message,
                }
            };
        }
    }

    resetPassword = async (request, context) => {
        try {
            const { email, newPassword } = await request.json() || {};
            await AuthService.resetPassword(email, newPassword);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Password reset successful'
                }
            };
        } catch (error) {
            const err = logError('resetPassword', error);
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    requestAccountDeletion = async (request, context) => {
        try {
            const userId = context.user?._id;

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const result = await AuthService.markForDeletion(userId);

            return {
                status: result.statusCode,
                jsonBody: {
                    success: result.success,
                    message: result.message
                }
            };
        } catch (error) {
            const err = logError('requestAccountDeletion', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to process deletion request'
                }
            };
        }
    }

    deleteUser = async (request, context) => {
        try {
            const userId = context.user?._id; // Get user ID from auth middleware

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            // Call service method to mark user for deletion
            const result = await AuthService.markForDeletion(userId);

            return {
                status: result.statusCode,
                jsonBody: {
                    success: result.success,
                    message: result.message
                }
            };
        } catch (error) {
            const err = logError('deleteUser', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to process account deletion request'
                }
            };
        }
    }

    updatePhoneVerify = async (request, context) => {
        try {
            const userId = context.user?._id;

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            // Call service method to update phone verification
            const result = await AuthService.updatePhoneVerify(userId, await request.json() || {});

            return {
                status: result.statusCode,
                jsonBody: {
                    success: result.success,
                    message: result.message
                }
            };
        } catch (error) {
            const err = logError('updatePhoneVerify', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to process updatePhoneVerify request'
                }
            };
        }
    }

    sendLoginOTP = async (request, context) => {
        try {
            const { identifier, type } = await request.json() || {};

            if (!identifier || !type) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Identifier (email/phone) and type are required'
                    }
                };
            }

            if (!['email', 'phone'].includes(type)) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Type must be either email or phone'
                    }
                };
            }

            const result = await AuthService.sendLoginOTP(identifier, type);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: result.message || 'OTP sent successfully',
                    data: {
                        type: result.type,
                        identifier: result.identifier
                    }
                }
            };
        } catch (error) {
            const err = logError('sendLoginOTP', error, { });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    verifyLoginOTP = async (request, context) => {
        try {
            const { identifier, code, type, appName } = await request.json() || {};

            if (!identifier || !code || !type) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Identifier, code, and type are required'
                    }
                };
            }

            const { responseData } = await AuthService.verifyLoginOTP(identifier, code, type, appName);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: responseData,
                    message: 'Login successful'
                }
            };
        } catch (error) {
            const err = logError('verifyLoginOTP', error, { });
            return {
                status: 401,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    checkEmailVerification = async (request, context) => {
        try {
            const userId = context.user?._id;
            context.log(`Checking email verification for user: ${userId}`);
            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            // Call service method to check email verification
            const isEmailVerified = await AuthService.isEmailVerified(userId);
            context.log(`User ${userId} email verification status: ${isEmailVerified}`);
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Email verification status retrieved successfully',
                    data: {
                        emailVerified: isEmailVerified
                    }
                }
            };

        } catch (error) {
            const err = logError('checkEmailVerification', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to check email verification status'
                }
            };
        }
    }

    checkBothVerification = async (request, context) => {
        try {
            const userId = context.user?._id;

            if (!userId) {
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            // Call service method to check both verifications
            const areBothVerified = await AuthService.isBothVerified(userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Verification status retrieved successfully',
                    data: {
                        bothVerified: areBothVerified
                    }
                }
            };

        } catch (error) {
            const err = logError('checkBothVerification', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to check verification status'
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new AuthController();
