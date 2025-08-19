// services/AuthService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userProfile');
const Wallet = require('../models/wallet');
const { logError } = require('../utils/logError');
const constants = require('../config/app.config');
const TaskService = require('./TaskService');
const { EmailApiService } = require('./EmailApiService');
const GoalsService = require('../services/GoalsService');
const BuildFunctionalityService = require('../services/BuildFunctionalityService');
const jwt_decode = require('jwt-decode');
class AuthService {

    static async findUserById(id) {
        try {
            return await User.findById(id);
        } catch (error) {
            throw logError('findUserById', error, { id });
        }
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

    static async generateTokens(user) {
        try {
            console.log(`Generating tokens for user: ${user._id}`);
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

    static generateEmailVerificationToken() {
        try {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let token = '';

            for (let i = 0; i < 6; i++) {
                const randomIndex = Math.floor(Math.random() * characters.length);
                token += characters[randomIndex];
            }

            return token;
        } catch (error) {
            throw logError('generateVerificationToken', error);
        }
    }

    /**
     * Generate a random token for email verification
     * @returns {string} A random hex string
     */
    static generateVerificationToken() {
        try {
            return crypto.randomBytes(32).toString('hex');
        } catch (error) {
            throw logError('generateVerificationToken', error);
        }
    }

    /**
     * Generate a 6-digit OTP for phone verification
     * @returns {string} A 6-digit OTP
     */
    static generateOTP() {
        try {
            return Math.floor(100000 + Math.random() * 900000).toString();
        } catch (error) {
            throw logError('generateOTP', error);
        }
    }

    /**
     * Send a verification email to the user
     * @param {string} email - The user's email address
     * @param {string} token - The verification token
     * @returns {Promise<void>}
     */
    static async sendVerificationEmail(email, token, options = {}) {
        try {
            console.log(`Sending verification email to: ${email} , ${token}`);
            if (!email || !token) {
                return { success: false, error: 'Email and token are required' };
            }

            let emailData;

            // Check if this is for login OTP (based on options.isLoginOTP flag)
            if (options.isLoginOTP) {
                // For OTP-based login authentication
                emailData = {
                    to: email,
                    from: "Actofit Team <noreply@actofit.com>",
                    subject: options.subject,
                    htmlTemplate: EmailApiService.generateEmailOTPHtmlTemplate(email, token),
                    textTemplate: EmailApiService.generateEmailOTPTextTemplate(email, token),
                    ...options
                };
            } else {
                // For regular email verification (URL-based)
                const appUrl = process.env.APP_URL;
                const verificationUrl = options.isDeviceAuth == true ? `${appUrl}/v1/device-auth/verify-email/${token}` : `${appUrl}/v1/auth/verify-email/${token}`;

                emailData = {
                    to: email,
                    from: "Actofit Team <noreply@actofit.com>",
                    subject: 'ActoFit - Verify Your Email Address',
                    htmlTemplate: EmailApiService.generateEmailVerificationHtmlTemplate(verificationUrl, email),
                    textTemplate: EmailApiService.generateEmailVerificationTextTemplate(verificationUrl, email),
                    ...options
                };
            }

            const result = await EmailApiService.sendEmail(emailData);
            console.log(`Verification email sent successfully to: ${email}`);
            return { success: true, result };

        } catch (error) {
            console.error('sendVerificationEmail error:', error.message);
            return { success: false, error: error.message };
        }
    }

    static generateEmailOTPHtmlTemplate(email, token) {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ActoFit - Login Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #333333; margin: 0;">ActoFit</h1>
                <p style="color: #666666; margin: 5px 0 0 0;">Your Fitness Journey Starts Here</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #333333; margin: 0 0 15px 0; text-align: center;">Login Verification Code</h2>
                <p style="color: #666666; margin: 0 0 20px 0; text-align: center;">
                    Please use the following verification code to complete your login:
                </p>
                
                <div style="background-color: #ffffff; border: 2px dashed #007bff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <h1 style="color: #007bff; font-size: 32px; letter-spacing: 4px; margin: 0; font-family: 'Courier New', monospace;">
                        ${token}
                    </h1>
                    <p style="color: #666666; margin: 10px 0 0 0; font-size: 14px;">
                        Copy and paste this code
                    </p>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="color: #856404; margin: 0; font-size: 14px;">
                        <strong>⚠️ Security Notice:</strong> This code will expire in 24 hours. Never share this code with anyone.
                    </p>
                </div>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
                <p style="color: #666666; margin: 0; font-size: 14px;">
                    If you didn't request this login verification, please ignore this email.
                </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">
            
            <div style="text-align: center;">
                <p style="color: #999999; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} ActoFit. All rights reserved.
                </p>
                <p style="color: #999999; font-size: 12px; margin: 5px 0 0 0;">
                    This email was sent to ${email}
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
    }

    static generateEmailOTPTextTemplate(token, email) {
        return `
ActoFit - Login Verification Code

Hello,

Please use the following verification code to complete your login:

VERIFICATION CODE: ${token}

Simply copy and paste this code when prompted during the login process.

IMPORTANT SECURITY INFORMATION:
- This code will expire in 24 hours
- Never share this code with anyone
- If you didn't request this login verification, please ignore this email

Thank you for using ActoFit!

---
© ${new Date().getFullYear()} ActoFit. All rights reserved.
This email was sent to ${email}
    `;
    }

    /**
     * Send a verification OTP via SMS using Azure Communication Services
     * @param {string} phoneNumber - The user's phone number
     * @param {string} otp - The OTP code
     * @returns {Promise<boolean>}
     */
    static async sendPhoneVerification(phoneNumber, otp, appName) {
        try {
            if (!phoneNumber || !otp) {
                throw new Error('Phone number and OTP are required');
            }
            console.log("Phone Number: ", phoneNumber);
            console.log("OTP: ", otp);
            try {
                // Using fetch API
                const response = await fetch('https://otpmicroservice.azurewebsites.net/api/send-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        phoneNumber: `+${phoneNumber}`,
                        otpToken: otp,
                        appTemplateName: appName || constants.APP_NAME
                    })
                });

                if (!response.ok) {
                    throw new Error('SMS service is currently unavailable. Please try again later.');
                }

                const result = await response.json();
                return result;

            } catch (apiError) {
                throw new Error(`${apiError.message}`);
            }
        } catch (error) {
            throw logError('sendPhoneVerification', error, { phoneNumber: phoneNumber?.toString().slice(-4) });
        }
    }

    static async registerUser(userData) {
        try {
            const { email, password, firstName, lastName, dateOfBirth, gender, age, height, weight, phoneNumber, appName, buildNumber = "1.1.5" } = userData;
            const userExists = await User.findOne({ email: email.toLowerCase() });
            if (userExists) {
                const responseData = {
                    success: false,
                    message: 'User already exists with this email'
                };
                return { responseData };
            }

            const salt = await bcrypt.genSalt(parseInt(constants.SALT_ROUNDS));
            const hashedPassword = await bcrypt.hash(password, salt);

            const wallet = await Wallet.create({ balance: 0 });

            // Generate verification tokens
            const emailToken = this.generateVerificationToken();
            const phoneOTP = phoneNumber ? this.generateOTP() : null;
            if (appName == "ProHealth") {
                phoneOTP = null;
            }

            const user = await User.create({
                email: email.toLowerCase(),
                password: hashedPassword,
                walletId: wallet._id,
                // Add verification fields
                emailVerified: true,
                emailVerificationToken: null,
                emailVerificationExpires: null,
                phoneVerified: true,
                phoneVerificationCode: null,
                createdFrom: appName || constants.APP_NAME,
                phoneVerificationExpires: phoneOTP ? new Date(Date.now() + 15 * 60 * 1000) : null, // 15 minutes
                profile: {
                    firstName: firstName,
                    lastName: lastName,
                    dateOfBirth: dateOfBirth,
                    gender: gender,
                    age: age,
                    height: height,
                    weight: weight,
                    phoneNumber: phoneNumber
                }
            });
                
            // Initialize verification status message
            let verificationMessage = 'User registered successfully';
            let emailSent = false;
            let smsSent = false;

            // Send verification emails/SMS if enabled
            // if (process.env.ENABLE_VERIFICATION === 'true') {
            //     // Try to send verification email
            //     try {
            //         const emailResult = await this.sendVerificationEmail(email, emailToken);
            //         if (emailResult.success) {
            //             emailSent = true;
            //         } else {
            //             console.error('Email verification failed:', emailResult.error);
            //         }
            //     } catch (emailError) {
            //         console.error('Email verification sending failed:', emailError.message);
            //     }

            //     // Send verification SMS if phone number provided
            //     const buildFeatures = await BuildFunctionalityService.getBuildFunctionality(buildNumber);
            //     if (phoneNumber && phoneOTP) {
            //         if (buildFeatures && !buildFeatures.isSmsOtpEnabled) {
            //             user.phoneVerified = true;
            //             user.phoneVerificationCode = null;
            //             user.phoneVerificationExpires = null;
            //             await user.save();
            //             smsSent = true; // Consider it as sent since it's auto-verified
            //         } else {
            //             // Try to send phone verification
            //             try {
            //                 const smsResult = await this.sendPhoneVerification(phoneNumber, phoneOTP);
            //                 if (smsResult && smsResult.success) {
            //                     smsSent = true;
            //                 } else {
            //                     console.error('SMS verification failed:', smsResult ? smsResult.error : 'Unknown error');
            //                 }
            //             } catch (smsError) {
            //                 console.error('SMS verification sending failed:', smsError.message);
            //             }
            //         }
            //     } else {
            //         smsSent = true; // No SMS needed, so consider it as handled
            //     }

            //     // Set appropriate message based on what succeeded/failed
            //     if (!emailSent && !smsSent && phoneNumber && phoneOTP) {
            //         verificationMessage = 'User registered successfully. Email and SMS verification pending - please try again later';
            //     } else if (!emailSent) {
            //         verificationMessage = 'User registered successfully. Email verification pending - please try again later';
            //     } else if (!smsSent && phoneNumber && phoneOTP && !(buildFeatures && !buildFeatures.isSmsOtpEnabled)) {
            //         verificationMessage = 'User registered successfully. SMS verification pending - please try again later';
            //     }
            // }

            const { jwtAccessToken } = await this.generateTokens(user);

            // Add token to result
            const responseData = {
                success: true,
                message: verificationMessage,
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
                    isHealthConnect: user?.isHealthConnect,
                    isATCoach: user?.isATCoach,
                    isWorkout: user?.isWorkout,
                    isFoodScan: user?.isFoodScan,
                    isGenerateDiet: user?.isGenerateDiet,
                    isSOS: user?.isSOS,
                    isSRT: user?.isSRT,
                    isUploadBloodTestReport: user?.isUploadBloodTestReport,
                },
                token: jwtAccessToken
            };

            // create a new daily reward for the user
            await TaskService.getUserDailyRewards(user._id, new Date());

            return {
                responseData
            };
        } catch (error) {
            throw logError('registerUser', error, { email: userData.email });
        }
    }

    static async createAccount(userData) {
        try {
            const { email, password, firstName, lastName, dateOfBirth, gender, age, height, weight, phoneNumber } = userData;
            await User.findOneAndDelete({ email: email.toLowerCase() });

            const salt = await bcrypt.genSalt(parseInt(constants.SALT_ROUNDS));
            const hashedPassword = await bcrypt.hash(password, salt);

            const wallet = await Wallet.create({ balance: 0 });

            const user = await User.create({
                email: email.toLowerCase(),
                password: hashedPassword,
                walletId: wallet._id,
                // Add verification fields
                emailVerified: true,
                phoneVerified: true,
                createdFrom: constants.APP_NAME,
                profile: {
                    firstName: firstName,
                    lastName: lastName,
                    dateOfBirth: dateOfBirth,
                    gender: gender,
                    age: age,
                    height: height,
                    weight: weight,
                    phoneNumber: phoneNumber
                }
            });

            await GoalsService.createGoals(user._id);

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
                    isHealthConnect: user?.isHealthConnect,
                    isATCoach: user?.isATCoach,
                    isWorkout: user?.isWorkout,
                    isFoodScan: user?.isFoodScan,
                    isGenerateDiet: user?.isGenerateDiet,
                    isSOS: user?.isSOS,
                    isSRT: user?.isSRT,
                    isUploadBloodTestReport: user?.isUploadBloodTestReport,
                },
                token: jwtAccessToken
            };

            // create a new daily reward for the user
            await TaskService.getUserDailyRewards(user._id, new Date());

            return {
                responseData
            };
        } catch (error) {
            throw logError('registerUser', error, { email: userData.email });
        }
    }

    static async loginUser(credentials) {
        try {
            console.log("credentials: ", credentials);
            const { email, password, appName } = credentials;

            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                throw new Error('Invalid credentials');
            }
            
            if(!user.password)
            {
                throw new Error('Password not set');
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
                    isHealthConnect: user?.isHealthConnect,
                    isATCoach: user?.isATCoach,
                    isWorkout: user?.isWorkout,
                    isFoodScan: user?.isFoodScan,
                    isGenerateDiet: user?.isGenerateDiet,
                    isSOS: user?.isSOS,
                    isSRT: user?.isSRT,
                    isUploadBloodTestReport: user?.isUploadBloodTestReport,
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

    /**
     * Verify email using token
     * @param {string} token - The verification token
     * @returns {Promise<Object>} Result of verification
     */
    static async verifyEmail(token) {
        try {
            if (!token) {
                throw new Error('Verification token is required');
            }

            const user = await User.findOne({
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

    /**
     * Verify phone using OTP
     * @param {string} phone - The phone number
     * @param {string} code - The verification code
     * @returns {Promise<Object>} Result of verification
     */
    static async verifyPhone(phone, code) {
        try {
            if (!phone || !code) {
                throw new Error('Phone number and verification code are required');
            }

            const user = await User.findOne({
                'profile.phoneNumber': phone,
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

    /**
     * Resend verification token/code
     * @param {string} userId - User ID
     * @param {string} type - Type of verification ('email' or 'phone')
     * @returns {Promise<Object>} Result of the operation
     */
    static async resendVerification(userId, type) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            if (type === 'email') {
                // Generate new email token
                const emailToken = this.generateVerificationToken();
                user.emailVerificationToken = emailToken;
                user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
                await user.save();

                // Send verification email
                await this.sendVerificationEmail(user.email, emailToken);

                return {
                    success: true,
                    message: 'Verification email sent successfully'
                };
            } else if (type === 'phone') {
                if (!user.profile.phoneNumber) {
                    throw new Error('User does not have a phone number');
                }

                // Generate new phone OTP
                const phoneOTP = this.generateOTP();
                user.phoneVerificationCode = phoneOTP;
                user.phoneVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
                await user.save();

                // Send verification SMS
                await this.sendPhoneVerification(user.profile.phoneNumber, phoneOTP);

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

    static async changePassword(userId, passwords) {
        try {
            const { currentPassword, newPassword } = passwords;
            const user = await this.findUserById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                throw new Error('Current password is incorrect');
            }

            const salt = await bcrypt.genSalt(parseInt(constants.SALT_ROUNDS));
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            user.password = hashedPassword;
            await user.save();

            return true;
        } catch (error) {
            throw logError('changePassword', error, { userId });
        }
    }

    static async verifyToken(token) {
        try {
            if (!token) {
                throw new Error('No token provided');
            }

            const decoded = jwt.verify(token, constants.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');

            if (!user) {
                throw new Error('User not found');
            }

            return {
                user,
                tokenExpiry: new Date(decoded.exp * 1000)
            };
        } catch (error) {
            throw logError('verifyToken', error, { token });
        }
    }

    static async resetPasswordRequest(email) {
        try {
            // Find user in database
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                throw new Error('User not found');
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
            const user = await User.findOne({ email: email.toLowerCase() });
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

            const user = await User.findOne({
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

    static async validateAndRefreshToken(userId) {
        try {
            const user = await User.findById(userId);
            if (!user || !user.googleAuth) {
                throw new Error('User or Google auth data not found');
            }

            const currentTime = Date.now();
            if (user.googleAuth.expiry_date - currentTime <= 300000) {
                if (!user.googleAuth.refresh_token) {
                    throw new Error('No refresh token available');
                }

                const newTokens = await this.refreshAccessToken(user.googleAuth.refresh_token);

                await User.findByIdAndUpdate(userId, {
                    'googleAuth.access_token': newTokens.access_token,
                    'googleAuth.expiry_date': newTokens.expiry_date
                });

                return newTokens.access_token;
            }

            return user.googleAuth.access_token;
        } catch (error) {
            throw logError('validateAndRefreshToken', error, { userId });
        }
    }

    static async handleGoogleCallback(googleUserData) {
        try {
            const { user, credential, profile, appName, buildNumber = '1.1.5' } = googleUserData;

            let existingUser = await User.findOne({ email: profile.email });
            if (!existingUser) {
                // Create a new wallet for the user
                const wallet = await Wallet.create({ balance: 0 });
                // Send verification SMS if phone number provided
                const buildFeatures = await BuildFunctionalityService.getBuildFunctionality(buildNumber);
                const isSmsOtpEnabled = (buildFeatures && !buildFeatures.isSmsOtpEnabled) ? true : false;
                
                // Create new user
                existingUser = new User({
                    email: profile.email,
                    walletId: wallet._id,
                    // Set verified status for social login
                    emailVerified: true, // Email is verified through Google
                    phoneVerified: appName == "ProHealth" ? true : isSmsOtpEnabled ? true : false, // Phone still needs verification
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

                await TaskService.getUserDailyRewards(existingUser._id, new Date());
            } else {

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
                if (appName == "ProHealth") existingUser.phoneVerified = true;
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
                    isMedicationResponded: existingUser?.isMedicationResponded,
                    isGoalsResponded: existingUser?.isGoalsResponded,
                    isSubscribed: existingUser?.isSubscribed,
                    dateOfBirth: existingUser?.profile.dateOfBirth,
                    gender: existingUser?.profile.gender,
                    height: existingUser?.profile.height,
                    weight: existingUser?.profile.weight,
                    emailVerified: existingUser.emailVerified,
                    phoneVerified: existingUser.phoneVerified,
                    userFeature: {
                        isPharmacy: existingUser?.isPharmacy,
                        isInsurance: existingUser?.isInsurance,
                        isBloodTest: existingUser?.isBloodTest,
                        isOfflineAccount: existingUser?.isOfflineAccount,
                        isHealthConnect: existingUser?.isHealthConnect,
                        isATCoach: existingUser?.isATCoach,
                        isWorkout: existingUser?.isWorkout,
                        isFoodScan: existingUser?.isFoodScan,
                        isGenerateDiet: existingUser?.isGenerateDiet,
                        isSOS: existingUser?.isSOS,
                        isSRT: existingUser?.isSRT,
                        isUploadBloodTestReport: existingUser?.isUploadBloodTestReport,
                    },

                },
                token: jwtAccessToken
            };
        } catch (error) {
            throw logError('handleGoogleCallback', error, { email: googleUserData.profile.email });
        }
    }

    static async handleAppleCallback(appleUserData, context) {
        try {
            const { credential, profile, appName, buildNumber = '1.1.5' } = appleUserData;

            // Extract email and user ID (sub)
            let email = profile?.email;

            if(!email) {
                const decoded = jwt_decode(credential.identityToken);
                context.log("decoded identityToken data:", decoded);
                email = decoded.email;
            }

            const appleUniqueId = credential.user;

            // Try finding user by email or appleUniqueId
            let user = await User.findOne({
                $or: [
                    { email },
                    { appleUniqueId }
                ]
            });

            if (!user) {
                // Create a new wallet for the user
                const wallet = await Wallet.create({ balance: 0 });
                const buildFeatures = await BuildFunctionalityService.getBuildFunctionality(buildNumber);
                const isSmsOtpEnabled = (buildFeatures && !buildFeatures.isSmsOtpEnabled) ? true : false;

                const emailVerifyCheck = !!email || !!user?.email || !!appleUniqueId;
                // Create new user
                user = new User({
                    email: email || undefined, // If email is hidden, store undefined
                    appleUniqueId, // Save Apple unique ID (sub) to identify user later
                    walletId: wallet._id,
                    // Set verified status for social login
                    emailVerified: emailVerifyCheck, // Email is verified if provided by Apple
                    phoneVerified: appName == "ProHealth" ? true : isSmsOtpEnabled ? true : false, // Phone still needs verification
                    auth: {
                        provider: 'apple',
                        providerUserId: appleUniqueId,
                        accessToken: credential.accessToken,
                        isVerified: true,
                        lastLogin: new Date() // Set lastLogin time for new users
                    },
                    profile: {
                        firstName: profile?.firstName || '',
                        lastName: profile?.lastName || '',
                        profilePhoto: ''
                    }
                });
                await TaskService.getUserDailyRewards(user._id, new Date());
            } else {

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
                if (appName == "ProHealth") user.phoneVerified = true;
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
                    email: user.email || null, // Return null if email is hidden
                    isMedicationResponded: user?.isMedicationResponded,
                    isGoalsResponded: user?.isGoalsResponded,
                    isSubscribed: user?.isSubscribed,
                    dateOfBirth: user?.profile.dateOfBirth,
                    gender: user?.profile.gender,
                    height: user?.profile.height,
                    weight: user?.profile.weight,
                    emailVerified: user.emailVerified,
                    phoneVerified: user.phoneVerified,
                    userFeature: {
                        isPharmacy: user?.isPharmacy,
                        isInsurance: user?.isInsurance,
                        isBloodTest: user?.isBloodTest,
                        isOfflineAccount: user?.isOfflineAccount,
                        isHealthConnect: user?.isHealthConnect,
                        isATCoach: user?.isATCoach,
                        isWorkout: user?.isWorkout,
                        isFoodScan: user?.isFoodScan,
                        isGenerateDiet: user?.isGenerateDiet,
                        isSOS: user?.isSOS,
                        isSRT: user?.isSRT,
                        isUploadBloodTestReport: user?.isUploadBloodTestReport,
                    },
                },
                token: jwtAccessToken
            };

            return responseData;
        } catch (error) {
            throw logError('handleAppleCallback', error, { email: appleUserData?.profile?.email });
        }
    }

    static async handleMetaCallback(metaUserData) {
        try {
            const { credential, profile } = metaUserData;

            let user = await User.findOne({ email: profile.email });

            if (!user) {
                // Create a new wallet for the user
                const wallet = await Wallet.create({ balance: 0 });

                // Create new user
                user = new User({
                    email: profile.email,
                    walletId: wallet._id,
                    // Set verified status for social login
                    emailVerified: true, // Email is verified through Meta
                    phoneVerified: false, // Phone still needs verification
                    auth: {
                        provider: 'meta',
                        providerUserId: profile.id,
                        accessToken: credential.accessToken,
                        isVerified: true,
                        lastLogin: new Date() // Set lastLogin time for new users
                    },
                    profile: {
                        firstName: profile.first_name || '',
                        lastName: profile.last_name || '',
                        profilePhoto: profile.picture?.data?.url || ''
                    }
                });
            } else {

                // Update existing user
                user.auth = {
                    provider: 'meta',
                    providerUserId: profile.id,
                    accessToken: credential.accessToken,
                    isVerified: true,
                    lastLogin: new Date() // Update lastLogin time
                };

                // Update profile if needed
                if (profile.first_name) user.profile.firstName = profile.first_name;
                if (profile.last_name) user.profile.lastName = profile.last_name;
                if (profile.picture?.data?.url) user.profile.profilePhoto = profile.picture.data.url;

                // Mark email as verified since it's verified through Meta
                user.emailVerified = true;
            }

            await user.save();

            // Generate token
            const { jwtAccessToken } = await this.generateTokens(user);

            const responseData = {
                user: {
                    _id: user._id,
                    email: user.email,
                    isMedicationResponded: user?.isMedicationResponded,
                    isGoalsResponded: user?.isGoalsResponded,
                    isSubscribed: user?.isSubscribed,
                    dateOfBirth: user?.profile.dateOfBirth,
                    gender: user?.profile.gender,
                    height: user?.profile.height,
                    weight: user?.profile.weight,
                    emailVerified: user.emailVerified,
                    phoneVerified: user.phoneVerified,
                    userFeature: {
                        isPharmacy: user?.isPharmacy,
                        isInsurance: user?.isInsurance,
                        isBloodTest: user?.isBloodTest,
                        isOfflineAccount: user?.isOfflineAccount,
                    },
                },
                token: jwtAccessToken
            };

            return responseData;
        } catch (error) {
            throw logError('handleMetaCallback', error, { email: metaUserData.profile.email });
        }
    }

    static async markForDeletion(userId) {
        try {
            // Find the user
            const user = await User.findById(userId);

            if (!user) {
                return {
                    success: false,
                    message: 'User not found',
                    statusCode: 404
                };
            }

            // Calculate deletion date (90 days from now)
            const deletionDate = new Date();
            deletionDate.setDate(deletionDate.getDate() + 90);

            // Mark user for deletion by setting status to inactive
            // and adding deletion-related fields
            await User.findByIdAndUpdate(userId, {
                isActive: false,
                pendingDeletion: true,
                deletionRequestDate: new Date(),
                scheduledDeletionDate: deletionDate
            });

            // Schedule a job to permanently delete the user after 90 days
            // This could be implemented with a cron job or task scheduler

            return {
                success: true,
                message: 'Account marked for deletion. Login within 90 days to reactivate.',
                statusCode: 200
            };
        } catch (error) {
            logError('markForDeletion', error, { userId });
            return {
                success: false,
                message: 'Internal server error',
                statusCode: 500,
                error: error.message
            };
        }
    }

    /**
     * Check if a user is pending deletion and reactivate if they log in
     * This method should be called during the login process
     *
     * @param {string} userId - ID of the user logging in
     * @returns {boolean} Whether the user was reactivated
     */
    static async checkAndReactivateUser(userId) {
        try {
            const user = await User.findById(userId);

            if (!user) return false;

            // If user is pending deletion, reactivate their account
            if (user.pendingDeletion === true && user.isActive === false) {
                await User.findByIdAndUpdate(userId, {
                    isActive: true,
                    pendingDeletion: false,
                    deletionRequestDate: null,
                    scheduledDeletionDate: null
                });
                return true;
            }

            return false;
        } catch (error) {
            logError('checkAndReactivateUser', error, { userId });
            return false;
        }
    }

    /**
     * Permanently delete users who haven't logged in within 90 days
     * after being marked for deletion
     * This should be run as a scheduled job
     */
    static async cleanupPendingDeletions() {
        try {

            // Handle delete user functionality
            // const result = await User.deleteMany({
            //     pendingDeletion: true,
            //     scheduledDeletionDate: { $lt: currentDate }
            // });

            return {
                success: true,
                message: `Inactive accounts permanently deleted`
            };
        } catch (error) {
            logError('cleanupPendingDeletions', error);
            return {
                success: false,
                message: 'Failed to clean up pending deletions',
                error: error.message
            };
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
            const user = await User.findById(userId);
            if (!user) {
                return {
                    success: false,
                    message: 'User not found',
                    statusCode: 404
                };
            }

            // Generate OTP
            const phoneOTP = this.generateOTP();

            // Set expiration time (15 minutes from now)
            const phoneVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);

            // Create update data for UserService
            const updateData = {
                phoneNumber: Number(phoneNumber),
            };

            // Update user record using direct MongoDB operations to ensure proper handling
            try {
                await User.findByIdAndUpdate(
                    userId,
                    {
                        $set: {
                            'profile.phoneNumber': Number(phoneNumber),
                            phoneVerified: false,
                            phoneVerificationCode: phoneOTP,
                            phoneVerificationExpires: phoneVerificationExpires,
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
                await this.sendPhoneVerification(phoneNumber.toString(), phoneOTP);
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

    static async sendLoginOTP(identifier, type) {
        try {
            if (!identifier || !type) {
                throw new Error('Identifier and type are required');
            }

            if (!['email', 'phone'].includes(type)) {
                throw new Error('Type must be either email or phone');
            }

            let user;
            let errorMessage = 'User not found';
            // Find user based on type
            if (type === 'email') {
                user = await User.findOne({ email: identifier.toLowerCase() });
                if (!user) {
                    errorMessage = 'User with this email not found';
                }

            } else {
                user = await User.findOne({
                    'profile.phoneNumber': identifier,
                });
                if (!user) {
                    errorMessage = 'User with this phone number not found';
                }
            }

            if (!user) {
                throw new Error(errorMessage);
            }

            if (type === 'email') {
                // Generate email token and send email
                const emailToken = this.generateEmailVerificationToken();
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
                };
            } else {
                // Generate phone OTP and send SMS
                const phoneOTP = this.generateOTP();
                user.phoneVerificationCode = phoneOTP;
                user.phoneVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
                await user.save();

                await AuthService.sendPhoneVerification(user.profile.phoneNumber, phoneOTP);

                return {
                    success: true,
                    message: 'Login verification SMS sent successfully',
                    type: 'phone',
                    identifier: user.profile.phoneNumber
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
                user = await User.findOne({
                    email: identifier.toLowerCase(),
                    emailVerificationToken: code,
                    emailVerificationExpires: { $gt: Date.now() }
                });

                if (!user) {
                    throw new Error('Invalid or expired verification code');
                }

                // Clear verification fields
                user.emailVerificationToken = undefined;
                user.emailVerificationExpires = undefined;
            } else {
                user = await User.findOne({
                    'profile.phoneNumber': phone,
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

            // Generate JWT token
            const { jwtAccessToken } = await this.generateTokens(user);

            // Return same response structure as login method
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
                    profile: user.profile
                },
                userFeature: {
                    isPharmacy: user?.isPharmacy,
                    isInsurance: user?.isInsurance,
                    isBloodTest: user?.isBloodTest,
                    isOfflineAccount: user?.isOfflineAccount,
                    isHealthConnect: user?.isHealthConnect,
                    isATCoach: user?.isATCoach,
                    isWorkout: user?.isWorkout,
                    isFoodScan: user?.isFoodScan,
                    isGenerateDiet: user?.isGenerateDiet,
                    isSOS: user?.isSOS,
                    isSRT: user?.isSRT,
                    isUploadBloodTestReport: user?.isUploadBloodTestReport,
                },
                token: jwtAccessToken
            };

            return { responseData };
        } catch (error) {
            throw logError('verifyLoginOTP', error, { identifier, type });
        }
    }

    static async isEmailVerified(userId) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            // Find user by ID
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Return email verification status need to revert 
            return user.emailVerified; // Return false if email is verified, true if not

        } catch (error) {
            console.error('Error checking email verification:', error.message);
            return false;
        }
    }

    static async isBothVerified(userId) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            // Find user by ID
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Check both email and phone verification status
            const emailVerified = user.emailVerified || false;
            const phoneVerified = user.phoneVerified || false;

            // Return true only if both are verified
            return emailVerified && phoneVerified;

        } catch (error) {
            console.error('Error checking verification status:', error.message);
            return false;
        }
    }

}

module.exports = AuthService;
