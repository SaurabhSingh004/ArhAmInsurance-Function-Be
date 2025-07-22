const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { SmsClient } = require("@azure/communication-sms");
const DeviceUser = require('../models/actofitdeviceUsers');
const { logError } = require('../utils/logError');
const constants = require('../config/app.config');
const SubAccountService = require('./subAccountService');
const { EmailApiService } = require('./EmailApiService');
const AuthService = require('./AuthService');
const SubAccount = require('../models/subProfiles');
class DeviceAuthService {

    static generateOTP() {
        try {
            return Math.floor(100000 + Math.random() * 900000).toString();
        } catch (error) {
            throw logError('generateOTP', error);
        }
    }

    static async registerUser(userData) {
        try {
            const { email, password, firstName, lastName, dateOfBirth, gender, age, height, weight, phoneNumber } = userData;
            const userExists = await DeviceUser.findOne({ email: email.toLowerCase() });
            if (userExists) {
                const responseData = {
                    success: false,
                    message: 'User already exists with this email'
                };
                return { responseData };
            }

            const salt = await bcrypt.genSalt(parseInt(constants.SALT_ROUNDS));
            const hashedPassword = await bcrypt.hash(password, salt);

            // Generate verification tokens
            const emailToken = AuthService.generateVerificationToken();
            const phoneOTP = phoneNumber ? this.generateOTP() : null;

            const user = await DeviceUser.create({
                email: email.toLowerCase(),
                password: hashedPassword,
                // Add verification fields
                emailVerified: false,
                emailVerificationToken: emailToken,
                emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                phoneVerified: false,
                phoneVerificationCode: phoneOTP,
                phoneVerificationExpires: phoneOTP ? new Date(Date.now() + 15 * 60 * 1000) : null,
                phoneNumber: phoneNumber,
                profile: {
                    firstName: firstName,
                    lastName: lastName,
                    dateOfBirth: dateOfBirth,
                    gender: gender,
                    age: age,
                    height: height,
                    weight: weight
                }
            });

            let subProfileUser = null;
            const subAccountData = {
                owner: user._id,
                profile: {
                    email: email.toLowerCase(),
                    firstName: firstName,
                    lastName: lastName,
                    dateOfBirth: dateOfBirth,
                    gender: gender,
                    age: age,
                    height: height,
                    weight: weight,
                    phone: phoneNumber
                }
            }
            const subAccountuser = await SubAccountService.createSubAccount(subAccountData);
            subProfileUser = subAccountuser._id;

            // Send verification emails/SMS if enabled
            if (process.env.ENABLE_VERIFICATION === 'true') {
                let options = {
                    isDeviceAuth: true,
                    appName: "ACTDEV"
                };
                // Send verification email
                await AuthService.sendVerificationEmail(email, emailToken, options);

                // Send verification SMS if phone number provided
                if (phoneNumber && phoneOTP) {
                    await AuthService.sendPhoneVerification(phoneNumber, phoneOTP, "ACTDEV");
                }
            }

            const { jwtAccessToken } = await this.generateTokens(user);

            // Add token to result
            const responseData = {
                user: {
                    _id: user._id,
                    email: user.email,
                    isSubscribed: user?.isSubscribed,
                    emailVerified: user.emailVerified,
                    phoneVerified: user.phoneVerified
                },
                userFeature: {
                    isPharmacy: user?.isPharmacy,
                    isInsurance: user?.isInsurance,
                    isBloodTest: user?.isBloodTest,
                    isOfflineAccount: user?.isOfflineAccount,
                },
                subProfileUser: subProfileUser,
                token: jwtAccessToken
            };

            return {
                responseData
            };
        } catch (error) {
            throw logError('registerDeviceUser', error, { email: userData.email });
        }
    }


    static async loginUser(credentials) {
        try {
            const { email, password } = credentials;

            const user = await DeviceUser.findOne({ email: email.toLowerCase() });
            if (!user) {
                throw new Error('Invalid credentials');
            }

            if(user.password === undefined || user.password === null) {
                throw new Error('User account is not set up with a password');
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                throw new Error('Invalid credentials');
            }

            const { jwtAccessToken } = await this.generateTokens(user);

            await user.save();
            let subAccountUser = null;
            subAccountUser = await SubAccountService.getFirstSubAccountByOwner(user._id);
            console.log('Sub Account User:', subAccountUser);
            const responseData = {
                user: {
                    _id: user._id,
                    email: user.email,
                    isSubscribed: user?.isSubscribed,
                    emailVerified: user.emailVerified,
                    phoneVerified: user.phoneVerified,
                    profile: user.profile,
                    targetWeight: subAccountUser ? subAccountUser?.profile?.targetWeight : null
                },
                subProfileUser: subAccountUser._id,
                token: jwtAccessToken
            };
            return {
                responseData
            };
        } catch (error) {
            throw logError('loginUser', error, { email: credentials.email });
        }
    }


    static async generateTokens(user) {
        try {
            const jwtAccessToken = jwt.sign(
                { userId: user._id, email: user.email },
                constants.JWT_SECRET,
                { expiresIn: constants.JWT_EXPIRE }
            );
            return { jwtAccessToken };
        } catch (error) {
            throw logError('generateTokens', error, { userId: user._id });
        }
    }


    static async handleGoogleCallback(googleUserData) {
        try {
            const { user, credential, profile } = googleUserData;

            let existingUser = await DeviceUser.findOne({ email: profile.email });
            let subAccountUser = null;
            if (!existingUser) {
                // Create new user
                existingUser = new DeviceUser({
                    email: profile.email,
                    // Set verified status for social login
                    emailVerified: true, // Email is verified through Google
                    phoneVerified: false, // Phone still needs verification
                    auth: {
                        provider: 'google',
                        providerUserId: user.uid,
                        providerId: credential.providerId,
                        accessToken: credential.accessToken,
                        isVerified: profile.email_verified || true,
                        lastLogin: new Date() // Set lastLogin time for new users
                    },
                    profile: {
                        firstName: profile.given_name || profile.name?.split(' ')[0] || '',
                        lastName: profile.family_name || (profile.name?.split(' ').length > 1 ? profile.name?.split(' ').slice(1).join(' ') : ''),
                        profilePhoto: profile.picture || ''
                    }
                });

                const subAccountData = {
                    owner: existingUser._id,
                    profile: {
                        email: profile.email,
                        phone: profile.phoneNumber || null,
                        firstName: profile.given_name,
                        lastName: profile.family_name,
                    }
                }

                subAccountUser = await SubAccountService.createSubAccount(subAccountData);
                console.log('Created new sub-account:', subAccountUser);
            } else {

                subAccountUser = await SubAccountService.getFirstSubAccountByOwner(existingUser._id.toString());
                console.log('Retrieved existing sub-account:', subAccountUser);

                // Update existing user
                existingUser.auth = {
                    provider: 'google',
                    providerUserId: user.uid,
                    providerId: credential.providerId,
                    accessToken: credential.accessToken,
                    isVerified: profile.email_verified || existingUser.auth?.isVerified || true,
                    lastLogin: new Date() // Update lastLogin time
                };

                // Update profile if needed
                if (profile.given_name) existingUser.profile.firstName = profile.given_name;
                if (profile.family_name) existingUser.profile.lastName = profile.family_name;
                if (profile.picture) existingUser.profile.profilePhoto = profile.picture;
                // Mark email as verified since it's verified through Google
                existingUser.emailVerified = true;
            }

            await existingUser.save();

            // Generate token
            const { jwtAccessToken } = await this.generateTokens(existingUser);
            return {
                user: {
                    _id: existingUser._id,
                    email: existingUser.email,
                    isSubscribed: existingUser?.isSubscribed,
                    dateOfBirth: existingUser?.profile.dateOfBirth,
                    gender: existingUser?.profile.gender,
                    height: existingUser?.profile.height,
                    weight: existingUser?.profile.weight,
                    emailVerified: existingUser.emailVerified,
                    phoneVerified: existingUser.phoneVerified,
                    targetWeight: subAccountUser ? subAccountUser?.profile?.targetWeight : null
                },
                subProfileUser: subAccountUser._id,
                token: jwtAccessToken
            };
        } catch (error) {
            throw logError('handleGoogleCallback', error, { email: googleUserData.profile.email });
        }
    }

    static async handleAppleCallback(appleUserData) {
        try {
            const { credential, profile } = appleUserData;

            // Extract email and user ID (sub)
            const email = profile?.email;
            const appleUniqueId = credential.user;

            // Try finding user by email or appleUniqueId
            let user = await DeviceUser.findOne({
                $or: [
                    { email },
                    { appleUniqueId }
                ]
            });

            let subAccountUser = null;
            if (!user) {
                const emailVerifyCheck = !!email || !!user?.email || !!appleUniqueId;
                // Create new user
                user = new DeviceUser({
                    email: email || undefined, // If email is hidden, store undefined
                    appleUniqueId, // Save Apple unique ID (sub) to identify user later
                    // Set verified status for social login
                    emailVerified: emailVerifyCheck, // Email is verified if provided by Apple
                    phoneVerified: false, // Phone still needs verification
                    auth: {
                        provider: 'apple',
                        providerUserId: appleUniqueId,
                        accessToken: credential.accessToken,
                        isVerified: true,
                        lastLogin: new Date()
                    },
                    profile: {
                        firstName: profile?.firstName || '',
                        lastName: profile?.lastName || '',
                        profilePhoto: ''
                    }
                });

                const subAccountData = {
                    owner: user._id,
                    profile: {
                        email: email || null,
                        phone: profile?.phoneNumber || null,
                        firstName: profile?.firstName,
                        lastName: profile?.lastName
                    }
                }
                subAccountUser = await SubAccountService.createSubAccount(subAccountData);

            } else {
                // Check if user account was marked for deletion and reactivate if needed
                if (user.pendingDeletion === true) {
                    wasReactivated = await this.checkAndReactivateUser(user._id);
                }

                subAccountUser = await SubAccountService.getFirstSubAccountByOwner(user._id);

                // Update existing user
                user.auth = {
                    provider: 'apple',
                    providerUserId: appleUniqueId,
                    accessToken: credential.accessToken,
                    isVerified: true,
                    lastLogin: new Date() // Update lastLogin time
                };

                // Update profile only if new data is available
                if (profile?.firstName) user.profile.firstName = profile.firstName;
                if (profile?.lastName) user.profile.lastName = profile.lastName;
                // If email is not available, update appleUniqueId to prevent conflicts
                if (!user.email) {
                    user.appleUniqueId = appleUniqueId;
                }

                // Mark email as verified since it's verified through Apple
                if (email || (user.email != null)) {
                    user.emailVerified = true;
                }
            }

            await user.save();

            // Generate token
            const { jwtAccessToken } = await this.generateTokens(user);

            const responseData = {
                user: {
                    _id: user._id,
                    email: user.email || null,
                    isSubscribed: user?.isSubscribed,
                    dateOfBirth: user?.profile.dateOfBirth,
                    gender: user?.profile.gender,
                    height: user?.profile.height,
                    weight: user?.profile.weight,
                    emailVerified: user.emailVerified,
                    phoneVerified: user.phoneVerified,
                    targetWeight: subAccountUser ? subAccountUser?.profile?.targetWeight : null
                },
                subProfileUser: subAccountUser._id,
                token: jwtAccessToken
            };

            return responseData;
        } catch (error) {
            throw logError('handleAppleCallback', error, { email: appleUserData?.profile?.email });
        }
    }
    /**
 * Send OTP for login via email or phone
 * @param {string} identifier - Email or phone number
 * @param {string} type - 'email' or 'phone'
 * @returns {Promise<Object>} Result of the operation
 */
    static async sendLoginOTP(identifier, type) {
        try {
            if (!identifier || !type) {
                throw new Error('Identifier and type are required');
            }

            if (!['email', 'phone'].includes(type)) {
                throw new Error('Type must be either email or phone');
            }

            let user;

            // Find user based on type
            if (type === 'email') {
                user = await DeviceUser.findOne({ email: identifier.toLowerCase() });
            } else {
                user = await DeviceUser.findOne({ phoneNumber: identifier });
            }

            if (!user) {
                throw new Error('User not found');
            }

            // Check if user account is pending deletion and reactivate if needed
            let wasReactivated = false;
            if (user.pendingDeletion === true) {
                wasReactivated = await this.checkAndReactivateUser(user._id);
            }

            if (type === 'email') {
                // Generate email token and send email
                const emailToken = AuthService.generateEmailVerificationToken();
                user.emailVerificationToken = emailToken;
                user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
                await user.save();
                let options = {
                    subject: 'ActoFit - Your Login Verification Code',
                    isLoginOTP: true,
                };

                await AuthService.sendVerificationEmail(user.email, emailToken, options);

                return {
                    success: true,
                    message: 'Login verification email sent successfully',
                    type: 'email',
                    identifier: user.email,
                    wasReactivated
                };
            } else {
                // Generate phone OTP and send SMS
                const phoneOTP = this.generateOTP();
                user.phoneVerificationCode = phoneOTP;
                user.phoneVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
                await user.save();

                await AuthService.sendPhoneVerification(user.phoneNumber, phoneOTP, "ACTDEV");

                return {
                    success: true,
                    message: 'Login verification SMS sent successfully',
                    type: 'phone',
                    identifier: user.profile.phoneNumber,
                    wasReactivated
                };
            }
        } catch (error) {
            throw logError('sendLoginOTP', error, { identifier, type });
        }
    }

    /**
     * Verify login OTP and return login response
     * @param {string} identifier - Email or phone number
     * @param {string} code - Verification code
     * @param {string} type - 'email' or 'phone'
     * @returns {Promise<Object>} Login response
     */
    static async verifyLoginOTP(identifier, code, type) {
        try {
            if (!identifier || !code || !type) {
                throw new Error('Identifier, code, and type are required');
            }

            if (!['email', 'phone'].includes(type)) {
                throw new Error('Type must be either email or phone');
            }

            let user;

            if (type === 'email') {
                user = await DeviceUser.findOne({
                    email: identifier.toLowerCase(),
                    emailVerificationToken: code,
                    emailVerificationExpires: { $gt: Date.now() }
                });
                console.log('User found:', user, code, identifier);
                if (!user) {
                    throw new Error('Invalid or expired verification code');
                }

                // Clear verification fields
                user.emailVerificationToken = undefined;
                user.emailVerificationExpires = undefined;
            } else {
                user = await DeviceUser.findOne({
                    phoneNumber: identifier,
                    phoneVerificationCode: code,
                    phoneVerificationExpires: { $gt: Date.now() }
                });

                if (!user) {
                    throw new Error('Invalid or expired verification code');
                }

                // Clear verification fields
                user.phoneVerificationCode = undefined;
                user.phoneVerificationExpires = undefined;
            }

            // Update last login
            if (user.auth) {
                user.auth.lastLogin = new Date();
            }

            await user.save();

            // Handle sub-account for actofitDevice
            let subAccountUser = null;
            subAccountUser = await SubAccountService.getFirstSubAccountByOwner(user._id);

            // Generate JWT token
            const { jwtAccessToken } = await this.generateTokens(user);

            // Return same response structure as login method
            const responseData = {
                user: {
                    _id: user._id,
                    email: user.email,
                    isSubscribed: user?.isSubscribed,
                    emailVerified: user.emailVerified,
                    phoneVerified: user.phoneVerified,
                    profile: user.profile,
                    targetWeight: subAccountUser ? subAccountUser?.profile?.targetWeight : null
                },
                subProfileUser: subAccountUser._id,
                token: jwtAccessToken
            };

            return { responseData };
        } catch (error) {
            throw logError('verifyLoginOTP', error, { identifier, type });
        }
    }


    static async resetPasswordRequest(email) {
        try {
            // Find user in database
            const user = await DeviceUser.findOne({ email: email.toLowerCase() });
            if (!user) {
                throw new Error('User with email not found');
            }

            // Generate OTP and update user record
            const emailToken = this.generateOTP();
            user.resetPasswordToken = emailToken;
            user.resetPasswordExpire = new Date(Date.now() + 3600000); // 1 hour expiry
            await user.save();

            // Prepare email data
            const emailData = {
                to: email,
                subject: "Reset Your ActoFit Password - OTP Inside",
                htmlTemplate: EmailApiService.generatePasswordResetHtmlTemplate(emailToken, email),
                textTemplate: EmailApiService.generatePasswordResetTextTemplate(emailToken, email),
                from: "ActoFit Security <noreply@actofit.com>"
            };

            // Send password reset email
            console.log(`Sending password reset email to: ${email}`);
            const emailResponse = await EmailApiService.sendEmail(emailData);

            if (!emailResponse.success) {
                console.error('Failed to send password reset email:', emailResponse);
                // Still return the token but log the email failure
                // Don't throw error to allow manual token usage if needed
            }

            console.log('Password reset email sent successfully:', {
                email,
                messageId: emailResponse.messageId,
                tokenGenerated: true
            });

            return {
                success: true,
                message: 'Password reset email sent successfully',
                token: emailToken, // Remove this in production for security
                emailSent: emailResponse.success,
                emailMessageId: emailResponse.messageId
            };

        } catch (error) {
            console.error('Error in resetPasswordRequest:', error);
            throw logError('resetPasswordRequest', error, { email });
        }
    }

    static async sendPasswordResetEmail(email, otp) {
        try {
            const emailService = new EmailApiService();

            const emailData = {
                to: email,
                subject: "Reset Your ActoFit Password - OTP Inside",
                htmlTemplate: emailService.generatePasswordResetHtmlTemplate(otp, email),
                textTemplate: emailService.generatePasswordResetTextTemplate(otp, email),
                from: "ActoFit Security <himanshu@actofit.com>"
            };

            const result = await EmailApiService.sendEmail(emailData);
            return result;

        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw error;
        }
    }

    static async verifyResetToken(email, token) {
        try {
            // 1. Find the user by email (lowercased for consistency)
            const user = await DeviceUser.findOne({ email: email.toLowerCase() });
            if (!user) {
                throw new Error('User not found');
            }

            // 2. Check that a reset token actually exists on the user record
            if (!user.resetPasswordToken) {
                throw new Error('No reset token set for this user');
            }

            // 3. Compare the stored token against the incoming token
            if (user.resetPasswordToken !== token) {
                throw new Error('Invalid reset token');
            }

            // 4. Check expiration
            if (user.resetPasswordExpire < Date.now()) {
                throw new Error('Reset token has expired');
            }

            // 5. If we reach here, the token is valid and unexpired
            return true;

        } catch (error) {
            // Use your existing logError utility (make sure the first argument is the
            // name of this method for easier debugging)
            throw logError('verifyResetToken', error, { email });
        }
    }


    static async resetPassword(email, newPassword) {
        try {

            const user = await DeviceUser.findOne({
                email: email
            });

            user.password = newPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

            return true;
        } catch (error) {
            throw logError('resetPassword', error, { token });
        }
    }

    static async updatePhoneVerify(userId, req) {
        try {
            const { phoneNumber } = req;

            // Validate phone number
            if (!phoneNumber) {
                return {
                    success: false,
                    message: 'Phone number is required',
                    statusCode: 400
                };
            }

            // Find the user
            const user = await DeviceUser.findById(userId);
            if (!user) {
                return {
                    success: false,
                    message: 'User not found',
                    statusCode: 404
                };
            }

            const existingPhoneNumber = await SubAccount.findOne({
                'profile.phoneNumber': phoneNumber.toString(),
                'owner': { $ne: userId }  // Ensure it’s a different owner
            });

            if (existingPhoneNumber) {
                throw new Error('Phone number is already registered to another user');
            }

            // Generate OTP
            const phoneOTP = this.generateOTP();

            // Set expiration time (15 minutes from now)
            const phoneVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);

            // Update user record using direct MongoDB operations to ensure proper handling
            try {
                await DeviceUser.findByIdAndUpdate(
                    userId,
                    {
                        $set: {
                            phoneNumber: phoneNumber.toString(),
                            phoneVerified: false,
                            phoneVerificationCode: phoneOTP,
                            phoneVerificationExpires: phoneVerificationExpires,
                            updatedAt: new Date()
                        }
                    },
                    { new: true, runValidators: true }
                );

                await SubAccount.findOneAndUpdate(
                    { owner: userId },
                    {
                        $set: {
                            'profile.phoneNumber': phoneNumber.toString(),
                            updatedAt: new Date()
                        }
                    },
                    { new: true, runValidators: true }
                );


            } catch (updateError) {
                console.error('User update error:', updateError);
                return {
                    success: false,
                    message: 'Failed to update user profile: ' + updateError.message,
                    statusCode: 500
                };
            }

            // Send verification SMS
            let otpSent = false;
            try {
                await AuthService.sendPhoneVerification(phoneNumber, phoneOTP, "ACTDEV");
                otpSent = true;
            } catch (smsError) {
                console.error('SMS sending error:', smsError);
            }

            return {
                success: true,
                message: otpSent
                    ? 'Phone number updated and verification code sent successfully'
                    : 'Phone number updated but verification code could not be sent. Please try again.',
                phoneNumberUpdated: true,
                otpSent: otpSent,
                phoneVerified: false,
                expiresAt: phoneVerificationExpires,
                statusCode: otpSent ? 200 : 207 // 207 for partial success
            };
        } catch (error) {
            console.error('updatePhoneVerify error:', error);
            const errorMsg = error.message || 'An unexpected error occurred';

            // Log the error using your utility
            logError('updatePhoneVerify', error, {
                userId,
                phoneNumber: req.phoneNumber ? req.phoneNumber.toString().slice(-4) : 'N/A'
            });

            // Return error response
            return {
                success: false,
                message: 'Failed to update phone number: ' + errorMsg,
                statusCode: 500
            };
        }
    }

    static async verifyPhone(phone, code) {
        try {
            if (!phone || !code) {
                throw new Error('Phone number and verification code are required');
            }

            const user = await DeviceUser.findOne({
                phoneNumber: phone,
                phoneVerificationCode: code,
                phoneVerificationExpires: { $gt: Date.now() }
            });

            if (!user) {
                throw new Error('Invalid or expired verification code');
            }

            // Update user verification status
            user.phoneVerified = true;
            user.phoneVerificationCode = undefined;
            user.phoneVerificationExpires = undefined;

            await user.save();

            return {
                success: true,
                message: 'Phone verified successfully',
                userId: user._id
            };
        } catch (error) {
            throw logError('verifyPhone', error, { phone });
        }
    }

    static async verifyEmail(token) {
        try {
            if (!token) {
                throw new Error('Verification token is required');
            }

            const user = await DeviceUser.findOne({
                emailVerificationToken: token,
                emailVerificationExpires: { $gt: Date.now() }
            });

            if (!user) {
                throw new Error('Invalid or expired verification token');
            }

            // Update user verification status
            user.emailVerified = true;
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;

            await user.save();

            return {
                success: true,
                message: 'Email verified successfully',
                userId: user._id
            };
        } catch (error) {
            throw logError('verifyEmail', error, { token });
        }
    }

    static async resendVerification(userId, type) {
        try {
            const user = await DeviceUser.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            if (type === 'email') {
                // Generate new email token
                const emailToken = AuthService.generateVerificationToken();
                user.emailVerificationToken = emailToken;
                user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
                await user.save();

                // Send verification email
                await AuthService.sendVerificationEmail(user.email, emailToken);

                return {
                    success: true,
                    message: 'Verification email sent successfully'
                };
            } else if (type === 'phone') {
                if (!user.phoneNumber) {
                    throw new Error('User does not have a phone number');
                }

                // Generate new phone OTP
                const phoneOTP = AuthService.generateOTP();
                user.phoneVerificationCode = phoneOTP;
                user.phoneVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
                await user.save();

                // Send verification SMS
                await AuthService.sendPhoneVerification(user.phoneNumber, phoneOTP, "ACTDEV");

                return {
                    success: true,
                    message: 'Verification SMS sent successfully'
                };
            } else {
                throw new Error('Invalid verification type');
            }
        } catch (error) {
            throw logError('resendVerification', error, { userId, type });
        }
    }
}

module.exports = DeviceAuthService;
