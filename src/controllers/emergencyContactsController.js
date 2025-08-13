const EmergencyContactService = require('../services/emergencyContactsService');
const EmergencyNumberService = require('../services/EmergencyNumberService');

const { logError } = require('../utils/logError');

class EmergencyContactController {

    addContact = async (request, context) => {
        try {
            const userId = context.user?._id;
            const contactData = await request.json() || {};

            if (!userId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: 'User ID is required'
                    }
                };
            }

            const contact = await EmergencyContactService.addContact(userId, contactData);

            return {
                status: 201,
                jsonBody: {
                    success: true,
                    data: contact,
                    message: 'Emergency contact added successfully'
                }
            };

        } catch (error) {
            context.error('Error adding contact:', error);
            const err = logError('addContact', error, { userId: request.query?.userId });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: err.message
                }
            };
        }
    }

    updateContact = async (request, context) => {
        try {
            const { id } = request.params || {};
            const contactData = await request.json() || {};

            if (!id) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: 'Contact ID is required'
                    }
                };
            }

            const contact = await EmergencyContactService.updateContact(id, contactData);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: contact,
                    message: 'Emergency contact updated successfully'
                }
            };

        } catch (error) {
            context.error('Error updating contact:', error);
            const err = logError('updateContact', error, { contactId: request.params?.id });
            return {
                status: 404,
                jsonBody: {
                    success: false,
                    error: err.message
                }
            };
        }
    }

    makeContactActive = async (request, context) => {
        try {
            const userId = context.user?._id;
            const { contactId } = request.query || {};

            if (!userId && !contactId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: 'Contact ID asnd UserId is required'
                    }
                };
            }

            const contact = await EmergencyContactService.makeContactActive(userId, contactId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: contact,
                    message: 'Emergency contact activated successfully'
                }
            };

        } catch (error) {
            context.error('Error activating contact:', error);
            const err = logError('activateContact', error, { contactId: request.query?.contactId });
            return {
                status: 404,
                jsonBody: {
                    success: false,
                    error: err.message
                }
            };
        }
    }

    deleteContact = async (request, context) => {
        try {
            const { id } = request.params || {};

            if (!id) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: 'Contact ID is required'
                    }
                };
            }

            await EmergencyContactService.deleteContact(id);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Emergency contact deleted successfully'
                }
            };

        } catch (error) {
            context.error('Error deleting contact:', error);
            const err = logError('deleteContact', error, { contactId: request.params?.id });
            return {
                status: 404,
                jsonBody: {
                    success: false,
                    error: err.message
                }
            };
        }
    }

    getContacts = async (request, context) => {
        try {
            const userId = context.user?._id;

            if (!userId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: 'User ID is required'
                    }
                };
            }

            const contacts = await EmergencyContactService.getContactsByUserId(userId);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: contacts,
                    count: contacts.length,
                    message: 'Emergency contacts retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting contacts:', error);
            const err = logError('getContacts', error, { userId: request.query?.userId });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    error: err.message
                }
            };
        }
    }

    getActiveContact = async (request, context) => {
        try {
            const userId = context.user?._id;
            const { code } = request.query || {};
            const contact = await EmergencyContactService.getActiveContact(userId) || process.env.DEFAULT_SOS_NUMBER;
            const countryEmergencyNumbers = await EmergencyNumberService.getEmergencyNumbers(code || 'MU');
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: {
                        phone: contact?.phone || contact,
                        emergencyNumbers: countryEmergencyNumbers
                    },
                    message: 'Emergency contact retrieved successfully'
                }
            };

        } catch (error) {
            context.error('Error getting contact:', error);
            const err = logError('getContact', error, { contactId: request.query.userId });
            return {
                status: 404,
                jsonBody: {
                    success: false,
                    error: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new EmergencyContactController();