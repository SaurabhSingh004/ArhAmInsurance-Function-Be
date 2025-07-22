const Contact = require('../models/increvolveContact');
const {logError} = require('../utils/logError');

/**
 * Increvolve Contact Controller
 * Handles contact form submissions and management
 */
class IncrevolveContactController {

    /**
     * Submit a new contact request
     * @param {Object} request - Request object
     * @param {Object} context - Context object
     */
    submitContact = async (request, context) => {
        try {
            const { name, email, phone, company, service, message } = await request.json() || {};

            // Validate required fields
            if (!name || !email) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Name and email are required'
                    }
                };
            }

            // Create new contact entry
            const contact = new Contact({
                name,
                email,
                phone,
                company,
                service,
                message
            });

            // Save to database
            await contact.save();

            return {
                status: 201,
                jsonBody: {
                    success: true,
                    message: 'Contact request submitted successfully',
                    data: {
                        id: contact._id,
                        name: contact.name,
                        email: contact.email
                    }
                }
            };
        } catch (error) {
            context.error('Contact submission error:', error);
            const err = logError('submitContact', error, { email: await request.json()?.email });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'An error occurred while submitting your request',
                    error: process.env.NODE_ENV === 'development' ? err.message : undefined
                }
            };
        }
    }

    getAllContactSubmissions = async (request, context) => {
        try {
            const contacts = await Contact.find().sort({ createdAt: -1 });
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    count: contacts.length,
                    data: contacts
                }
            };
        } catch (error) {
            const err = logError('getAllContactSubmissions', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    error: 'Server Error',
                    message: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new IncrevolveContactController();