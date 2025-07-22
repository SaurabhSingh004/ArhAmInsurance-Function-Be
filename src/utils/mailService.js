const nodemailer = require("nodemailer");
const path = require('path');
const User = require('../models/userProfile');
class EmailService {

    static async findUser(email) {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    static async sendSupportEmail(firstName, email, ticketId, userQuestion, userMessage) {
        // Construct the HTML content
        const logoPath = path.join(__dirname, '..', 'ignite-logo.png');

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f6f8;">
                <!-- Logo Header -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://saurabhsingh-static-site.s3.ap-southeast-1.amazonaws.com/ignite-logo.png" alt="Ignite Health Logo" style="width: 150px; height: auto;">
                </div>
                
                <!-- Main Content Container -->
                <div style="background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="color: #4CAF50; margin-bottom: 15px; text-align: center;">Your Support Ticket Has Been Created</h2>
                    <p style="color: #34495e; line-height: 1.6;">Dear ${firstName},</p>
                    <p style="color: #34495e; line-height: 1.6;">
                        We have received your support request and created ticket <strong>#${ticketId}</strong>. Our team will review your issue and get back to you as soon as possible.
                    </p>
                    
                    <!-- Ticket Details -->
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #2c3e50; margin-bottom: 10px;">Ticket Details:</h3>
                        <p style="color: #34495e; margin: 5px 0;"><strong>Ticket ID:</strong> #${ticketId}</p>
                        <p style="color: #34495e; margin: 5px 0;"><strong>Issue Description:</strong> ${userQuestion}</p>
                        <p style="color: #34495e; margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                    </div>
                    
                    <!-- User Submission Details -->
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #2c3e50; margin-bottom: 10px;">Your Submission:</h3>
                        <p style="color: #34495e; margin: 5px 0;"><strong>Question:</strong> ${userQuestion || 'N/A'}</p>
                        <p style="color: #34495e; margin: 5px 0;"><strong>Message:</strong> ${userMessage || 'N/A'}</p>
                    </div>
                    
                    <!-- Next Steps -->
                    <p style="color: #34495e; line-height: 1.6;">What happens next?</p>
                    <ul style="color: #34495e; line-height: 1.6;">
                        <li>Our support team will review your ticket.</li>
                        <li>You will receive updates on this email thread.</li>
                        <li>We aim to respond within 24 hours.</li>
                    </ul>
                    
                    <!-- Interactive Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="mailto:support@ignitehealth.com" style="background-color: #4CAF50; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Contact Support
                        </a>
                    </div>
                    
                    <p style="color: #34495e; line-height: 1.6;">Need to add more information? Simply reply to this email.</p>
                    
                    <!-- Signature -->
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
                        <p style="color: #34495e; line-height: 1.6;">
                            Best regards,<br>
                            Ignite Health Support Team
                        </p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 20px;">
                    <p>This is an automated message. Please do not reply directly to this email.</p>
                    <p>© 2025 Ignite Health. All rights reserved.</p>
                    <p style="color: #7f8c8d; margin-top: 10px;">
                        For additional assistance, please email 
                        <a href="mailto:support@ignitehealth.com" style="color: #7f8c8d; text-decoration: underline;">support@ignitehealth.com</a>
                        or call <strong>+1 (555) 123-4567</strong>.
                    </p>
                </div>
            </div>
        `;
    
        const mailOptions = {
            from: '"Ignite Health Support Team 🛠️" <himanshu@actofit.com>',
            to: email,
            subject: `Support Ticket #${ticketId} Received 🎫`,
            html: htmlContent,
        };
    
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'himanshu@actofit.com',
                pass: 'lxcd fqtv xtpf zxen'
            }
        });
    
        const info = await transporter.sendMail(mailOptions);
        return info;
    }    
}

module.exports = EmailService;