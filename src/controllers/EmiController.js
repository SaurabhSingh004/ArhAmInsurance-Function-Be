const EmiService = require('../services/EmiService');

class EmiController {
    /**
     * Calculate EMI
     * POST /api/emi/calculate
     */
    calculateEmi = async (request, context) => {
        try {
            const loanData = await request.json() || {};

            // Validate required fields
            const requiredFields = ['principal', 'interestRate', 'tenure'];
            const missingFields = requiredFields.filter(field => !loanData[field]);
            
            if (missingFields.length > 0) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: `Missing required fields: ${missingFields.join(', ')}`,
                        data: null
                    }
                };
            }

            const result = EmiService.calculateEMI(loanData);

            return {
                status: 200,
                jsonBody: result
            };

        } catch (error) {
            context.error('Error calculating EMI:', error);

            // Handle validation errors
            if (error.message.includes('must be') || 
                error.message.includes('cannot exceed') ||
                error.message.includes('between') ||
                error.message.includes('positive number')) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to calculate EMI',
                    data: null
                }
            };
        }
    }

    /**
     * Calculate loan amount based on EMI affordability
     * POST /api/emi/loan-amount
     */
    calculateLoanAmount = async (request, context) => {
        try {
            const affordabilityData = await request.json() || {};

            // Validate required fields
            const requiredFields = ['emi', 'interestRate', 'tenure'];
            const missingFields = requiredFields.filter(field => !affordabilityData[field]);
            
            if (missingFields.length > 0) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: `Missing required fields: ${missingFields.join(', ')}`,
                        data: null
                    }
                };
            }

            const result = EmiService.calculateLoanAmount(affordabilityData);

            return {
                status: 200,
                jsonBody: result
            };

        } catch (error) {
            context.error('Error calculating loan amount:', error);

            if (error.message.includes('must be') || 
                error.message.includes('cannot exceed') ||
                error.message.includes('between') ||
                error.message.includes('positive number')) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to calculate loan amount',
                    data: null
                }
            };
        }
    }

    /**
     * Compare multiple loan options
     * POST /api/emi/compare
     */
    compareLoanOptions = async (request, context) => {
        try {
            const { loanOptions } = await request.json() || {};

            if (!loanOptions || !Array.isArray(loanOptions)) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'loanOptions array is required',
                        data: null
                    }
                };
            }

            const result = EmiService.compareLoanOptions(loanOptions);

            return {
                status: 200,
                jsonBody: result
            };

        } catch (error) {
            context.error('Error comparing loan options:', error);

            if (error.message.includes('required') || 
                error.message.includes('must be') ||
                error.message.includes('At least')) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: error.message,
                        data: null
                    }
                };
            }

            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to compare loan options',
                    data: null
                }
            };
        }
    }
}

module.exports = new EmiController();