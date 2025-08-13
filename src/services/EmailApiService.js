const axios = require('axios');

class EmailApiService {
    // Static configuration
    static emailConfig = {
        apiUrl: process.env.EMAIL_SERVICE_URL,
        defaultCredentials: {
            service: "gmail",
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASSWORD
        },
        defaultFrom: process.env.EMAIL_FROM,
        timeout: 30000 // 30 seconds timeout
    };

    /**
     * Static method to send emails via Azure Function API
     * @param {Object} emailData - Email configuration
     * @returns {Promise<Object>} - API response
     */
    static async sendEmail(emailData) {
        try {
            const {
                to,
                subject,
                htmlTemplate,
                textTemplate,
                from,
                cc = null,
                bcc = null,
                attachments = null,
                emailCredentials = EmailApiService.emailConfig.defaultCredentials
            } = emailData;

            // Validate required fields
            if (!to || !subject) {
                throw new Error('Missing required fields: to and subject are mandatory');
            }

            if (!htmlTemplate && !textTemplate) {
                throw new Error('At least one template (htmlTemplate or textTemplate) is required');
            }

            // Prepare request payload
            const payload = {
                to,
                subject,
                htmlTemplate,
                textTemplate,
                from,
                emailCredentials
            };

            // Add optional fields only if they exist
            if (cc) payload.cc = cc;
            if (bcc) payload.bcc = bcc;
            if (attachments) payload.attachments = attachments;

            console.log('Sending email request to:', EmailApiService.emailConfig.apiUrl);
            console.log('Email payload:', {
                ...payload,
                emailCredentials: { ...payload.emailCredentials, password: '[HIDDEN]' }
            });

            // Make API call to Azure Function
            const response = await axios.post(EmailApiService.emailConfig.apiUrl, payload, {
                timeout: EmailApiService.emailConfig.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            console.log('Email API Response:', response.data);
            return response.data;

        } catch (error) {
            console.error('Email API Error:', error.message);

            if (error.response) {
                // API returned an error response
                console.error('API Error Response:', error.response.data);
                throw new Error(`Email service error: ${error.response.data.message || error.response.statusText}`);
            } else if (error.request) {
                // Request was made but no response received
                console.error('No response from email service');
                throw new Error('Email service is not responding. Please try again later.');
            } else {
                // Something else happened
                throw new Error(`Email configuration error: ${error.message}`);
            }
        }
    }

    /**
     * Static method to generate HTML template for password reset email
     * @param {string} otp - One-time password
     * @param {string} userEmail - User's email address
     * @returns {string} - HTML template
     */
    static generatePasswordResetHtmlTemplate(otp, userEmail) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Request</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }
                .email-container {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #007bff;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    color: #007bff;
                    margin-bottom: 10px;
                }
                .otp-container {
                    background: #f8f9fa;
                    border: 2px dashed #007bff;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    margin: 25px 0;
                }
                .otp-code {
                    font-size: 32px;
                    font-weight: bold;
                    color: #007bff;
                    letter-spacing: 5px;
                    margin: 10px 0;
                }
                .warning {
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                }
                .button {
                    display: inline-block;
                    background: #007bff;
                    color: white;
                    padding: 12px 25px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 15px 0;
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <div class="logo">🔐 ActoFit</div>
                    <h1>Password Reset Request</h1>
                </div>
                
                <p>Hello,</p>
                
                <p>We received a request to reset the password for your ActoFit account associated with <strong>${userEmail}</strong>.</p>
                
                <p>Please use the following One-Time Password (OTP) to reset your password:</p>
                
                <div class="otp-container">
                    <p>Your OTP Code:</p>
                    <div class="otp-code">${otp}</div>
                    <p><small>Valid for 60 minutes</small></p>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>This OTP is valid for 60 minutes only</li>
                        <li>Do not share this code with anyone</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>For security, this link will expire soon</li>
                    </ul>
                </div>
                
                <p>If you have any questions or need assistance, please contact our support team.</p>
                
                <div class="footer">
                    <p>
                        This email was sent from ActoFit Security System<br>
                        <small>© ${new Date().getFullYear()} ActoFit. All rights reserved.</small>
                    </p>
                    <p>
                        <small>
                            If you didn't request this password reset, you can safely ignore this email.
                            Your password will remain unchanged.
                        </small>
                    </p>
                </div>
            </div>
        </body>
        </html>`;
    }

    /**
     * Static method to generate plain text template for password reset email
     * @param {string} otp - One-time password
     * @param {string} userEmail - User's email address
     * @returns {string} - Plain text template
     */
    static generatePasswordResetTextTemplate(otp, userEmail) {
        return `
ActoFit - Password Reset Request

Hello,

We received a request to reset the password for your ActoFit account associated with ${userEmail}.

Your One-Time Password (OTP): ${otp}

This OTP is valid for 60 minutes only.

SECURITY NOTICE:
- Do not share this code with anyone
- If you didn't request this reset, please ignore this email
- This OTP will expire in 60 minutes for your security

If you have any questions or need assistance, please contact our support team.

---
© ${new Date().getFullYear()} ActoFit. All rights reserved.

If you didn't request this password reset, you can safely ignore this email.
Your password will remain unchanged.
        `.trim();
    }

    /**
     * Static method to generate HTML template for email verification
     * @param {string} verificationUrl - Verification URL with token
     * @param {string} userEmail - User's email address
     * @returns {string} - HTML template
     */
    static generateEmailVerificationHtmlTemplate(verificationUrl, userEmail) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }
                .email-container {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #4CAF50;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    color: #4CAF50;
                    margin-bottom: 10px;
                }
                .verify-button {
                    display: inline-block;
                    background: #4CAF50;
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 8px;
                    margin: 25px 0;
                    font-weight: bold;
                    font-size: 16px;
                    transition: background-color 0.3s;
                }
                .verify-button:hover {
                    background: #45a049;
                }
                .verification-container {
                    text-align: center;
                    background: #f8f9fa;
                    border: 2px solid #4CAF50;
                    border-radius: 8px;
                    padding: 25px;
                    margin: 25px 0;
                }
                .info-box {
                    background: #e8f5e8;
                    border: 1px solid #4CAF50;
                    color: #2d5a2d;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                }
                .alternative-link {
                    word-break: break-all;
                    color: #4CAF50;
                    font-size: 12px;
                    margin-top: 15px;
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <div class="logo">✅ ActoFit</div>
                    <h1>Verify Your Email Address</h1>
                </div>
                
                <p>Hello,</p>
                
                <p>Thank you for registering with ActoFit! We're excited to have you on board.</p>
                
                <p>To complete your registration and secure your account, please verify your email address <strong>${userEmail}</strong> by clicking the button below:</p>
                
                <div class="verification-container">
                    <p><strong>Click here to verify your email:</strong></p>
                    <a href="${verificationUrl}" class="verify-button">Verify Email Address</a>
                </div>
                
                <div class="info-box">
                    <strong>📋 Important Information:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px; text-align: left;">
                        <li>This verification link will expire in 24 hours</li>
                        <li>If you didn't create an account, you can safely ignore this email</li>
                        <li>Your account will remain inactive until email is verified</li>
                        <li>Keep this email for your records</li>
                    </ul>
                </div>
                
                <p><strong>Can't click the button?</strong> Copy and paste this link into your browser:</p>
                <div class="alternative-link">${verificationUrl}</div>
                
                <p>If you have any questions or need assistance, please contact our support team.</p>
                
                <div class="footer">
                    <p>
                        This email was sent from ActoFit Account Verification System<br>
                        <small>© ${new Date().getFullYear()} ActoFit. All rights reserved.</small>
                    </p>
                    <p>
                        <small>
                            This is an automated message. Please do not reply to this email.
                        </small>
                    </p>
                </div>
            </div>
        </body>
        </html>`;
    }

    /**
     * Static method to generate plain text template for email verification
     * @param {string} verificationUrl - Verification URL with token
     * @param {string} userEmail - User's email address
     * @returns {string} - Plain text template
     */
    static generateEmailVerificationTextTemplate(verificationUrl, userEmail) {
        return `
ActoFit - Email Verification Required

Hello,

Thank you for registering with ActoFit! We're excited to have you on board.

To complete your registration and secure your account, please verify your email address: ${userEmail}

VERIFICATION LINK:
${verificationUrl}

IMPORTANT INFORMATION:
- This verification link will expire in 24 hours
- If you didn't create an account, you can safely ignore this email
- Your account will remain inactive until email is verified

If you have any questions or need assistance, please contact our support team.

---
© ${new Date().getFullYear()} ActoFit. All rights reserved.

This is an automated message. Please do not reply to this email.
        `.trim();
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

    static generateEmailOTPTextTemplate(email, token) {
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

}

module.exports = {
    EmailApiService
};