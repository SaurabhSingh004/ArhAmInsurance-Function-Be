const { submitContactForm, getAllContacts } = require('../controllers/OcaviorContactController');
const increvolveContactController = require('../controllers/IncrevolveContactController');
const { logError } = require('../utils/logError');

class ContactOcaviorController {

    submitContactForm = async (request, context) => {
        try {
            // Use the existing submitContactForm function
            const result = await submitContactForm(request, {
                ...context,
                // Convert wellness pattern request to express-like request
                body: await request.json(),
                query: request.query,
                params: request.params
            });

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Contact form submitted successfully',
                    data: result
                }
            };
        } catch (error) {
            const err = logError('submitContactForm', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to submit contact form'
                }
            };
        }
    }

    getAllContacts = async (request, context) => {
        try {
            // Use the existing getAllContacts function
            const result = await getAllContacts(request, {
                ...context,
                body: await request.json(),
                query: request.query,
                params: request.params
            });

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Contacts retrieved successfully',
                    data: result
                }
            };
        } catch (error) {
            const err = logError('getAllContacts', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to retrieve contacts'
                }
            };
        }
    }

    submitIncrevolveContact = async (request, context) => {
        try {
            // Use the existing increvolve contact controller
            const result = await increvolveContactController.submitContact(request, {
                ...context,
                body: await request.json(),
                query: request.query,
                params: request.params
            });

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Increvolve contact form submitted successfully',
                    data: result
                }
            };
        } catch (error) {
            const err = logError('submitIncrevolveContact', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to submit Increvolve contact form'
                }
            };
        }
    }

    getAllIncrevolveContacts = async (request, context) => {
        try {
            // Use the existing getAllContactSubmissions function
            const result = await increvolveContactController.getAllContactSubmissions(request, {
                ...context,
                body: await request.json(),
                query: request.query,
                params: request.params
            });

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Increvolve contacts retrieved successfully',
                    data: result
                }
            };
        } catch (error) {
            const err = logError('getAllIncrevolveContacts', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message || 'Failed to retrieve Increvolve contacts'
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new ContactOcaviorController();
