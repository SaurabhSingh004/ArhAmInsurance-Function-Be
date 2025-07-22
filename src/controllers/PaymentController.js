const Stripe = require("stripe");
const {logError} = require('../utils/logError');
require("dotenv").config();

// Currently For Testing using hardcoded Stripe Secret Key
const stripe = Stripe("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");

class PaymentController {

    createStripePaymentIntent = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { amount, currency } = await request.json() || {};

            if (!amount || !currency) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: "Amount and currency are required"
                    }
                };
            }

            // Create payment intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount * 100, // Convert to cents
                currency: currency,
                payment_method_types: ["card"],
            });

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: {
                        clientSecret: paymentIntent.client_secret,
                        amount: paymentIntent.amount / 100, // Convert back to normal amount
                        currency: paymentIntent.currency
                    }
                }
            };
        } catch (error) {
            const err = logError('createStripePaymentIntent', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: "Error creating payment intent",
                    error: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new PaymentController();