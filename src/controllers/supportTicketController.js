const SupportTicket = require('../models/supportTicket');
const { sendSupportEmail } = require('../utils/mailService');
const {logError} = require('../utils/logError');

class SupportTicketController {

    createTicket = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { fullName, emailAddress, message, question, appName } = await request.json() || {};

            // Validate required fields
            if (!fullName || !emailAddress || !message) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Please provide all required fields'
                    }
                };
            }

            // Create new support ticket
            const ticket = new SupportTicket({
                user: userId,
                fullName,
                emailAddress,
                question,
                message,
                appName: appName || 'ACTWEL'
            });

            await ticket.save();
            const firstName = fullName.split(' ')[0];
            // await sendSupportEmail(firstName, emailAddress,ticket.ticketNumber, question, message );
            
            // Send email notification
            // await sendTicketConfirmation(emailAddress, ticket.ticketNumber);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Support ticket created successfully',
                    data: {
                        ticketNumber: ticket.ticketNumber,
                        status: ticket.status,
                        createdAt: ticket.createdAt
                    }
                }
            };

        } catch (error) {
            context.error('Error creating support ticket:', error);
            
            // Handle validation errors
            if (error.name === 'ValidationError') {
                const err = logError('createTicket', error, { userId: context.user?._id });
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Validation error',
                        errors: Object.values(error.errors).map(err => err.message)
                    }
                };
            }

            const err = logError('createTicket', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to create support ticket',
                    error: err.message
                }
            };
        }
    }
}

// Helper function to send email confirmation
async function sendTicketConfirmation(email, ticketNumber) {
    // Implement email sending logic here
    // You can use nodemailer or any other email service
    // This is just a placeholder
    context.log(`Sending confirmation email to ${email} for ticket ${ticketNumber}`);
}

// Export the controller instance
module.exports = new SupportTicketController();