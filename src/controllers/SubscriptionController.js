const Subscription = require('../models/subscription');
const User = require('../models/userProfile');
const Coupon = require('../models/coupon');
const {logError} = require('../utils/logError');

class SubscriptionController {

    getSubscriptionPlans = async (request, context) => {
        try {
            const subscriptions = await Subscription.find();

            if (!subscriptions || subscriptions.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'No subscription plans found'
                    }
                };
            }

            // Transform the subscriptions to match the exact format of mockPlans
            const transformedPlans = subscriptions.map(subscription => {
                const plan = {
                    id: subscription._id,
                    name: subscription.type.name,
                    price: subscription.type.price,
                    features: subscription.type.features
                };

                // Only add isBestValue if it's true
                if (subscription.type.isBestValue) {
                    plan.isBestValue = true;
                }

                // Only add additionalInfo if it exists
                if (subscription.type.additionalInfo) {
                    plan.additionalInfo = subscription.type.additionalInfo;
                }

                return plan;
            });

            return {
                status: 200,
                jsonBody: { data: transformedPlans }
            };
        } catch (error) {
            const err = logError('getSubscriptionPlans', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error fetching subscription plans',
                    error: err.message
                }
            };
        }
    }

    applyDiscountByCoupon = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { couponCode, planId } = await request.json() || {};

            if (!couponCode) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Coupon code is required'
                    }
                };
            }

            const coupon = await Coupon.findOne({ code: couponCode });
            context.log("coupon", coupon);
            if (!coupon || !coupon.isActive) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Invalid coupon code'
                    }
                };
            }

            if (coupon.usedBy.includes(userId)) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Coupon has already been used by this user'
                    }
                };
            }

            // Find the subscription plan by ID
            const subscription = await Subscription.findById(planId);

            if (!subscription) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'Subscription not found'
                    }
                };
            }

            const discount = coupon.discount;

            // Calculate the final amount after applying the discount
            const finalAmount = subscription.type.price - (subscription.type.price * discount / 100);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: `Discount of ${discount} applied successfully`,
                    data: {
                        plan: subscription.type.name,
                        originalAmount: subscription.type.price,
                        discount,
                        finalAmount,
                    }
                }
            };
        } catch (error) {
            const err = logError('applyDiscountByCoupon', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error applying discount',
                    error: err.message
                }
            };
        }
    }

    createSubscriptionPlan = async (request, context) => {
        try {
            const {
                id,
                name,
                price,
                features,
                isBestValue,
                additionalInfo,
                currencyUnit,
                currencySymbol,
                couponCode
            } = await request.json() || {};

            // Validate required fields
            if (!id || !name || !price || !features || !currencyUnit) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'id, name, price, features, and currencyUnit are required fields'
                    }
                };
            }

            // Validate plan id matches predefined values
            const validPlanIds = ['pro', 'pro-plus'];
            if (!validPlanIds.includes(id)) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Invalid plan id. Must be either "pro" or "pro-plus"'
                    }
                };
            }

            // Check if features array is properly structured
            if (!Array.isArray(features) || !features.every(f => f.id && f.name)) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Features must be an array of objects with id and name properties'
                    }
                };
            }

            // Check if the plan already exists
            const existingPlan = await Subscription.findOne({ 'type.id': id });
            if (existingPlan) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: `Subscription plan with id "${id}" already exists`
                    }
                };
            }

            // Create a new subscription plan
            const newSubscription = new Subscription({
                type: {
                    id,
                    name,
                    price,
                    features,
                    ...(isBestValue && { isBestValue }),
                    ...(additionalInfo && { additionalInfo })
                },
                currencyUnit,
                currencySymbol,
                couponCode: couponCode || [] // Optional array of { code: "COUPON_CODE", discount: 20 }
            });

            // Save to database
            const savedSubscription = await newSubscription.save();

            // Format the response to match the mockPlans structure
            const formattedResponse = {
                id: savedSubscription.type.id,
                name: savedSubscription.type.name,
                price: savedSubscription.type.price,
                features: savedSubscription.type.features,
                ...(savedSubscription.type.isBestValue && { isBestValue: savedSubscription.type.isBestValue }),
                ...(savedSubscription.type.additionalInfo && { additionalInfo: savedSubscription.type.additionalInfo })
            };

            // Send success response
            return {
                status: 201,
                jsonBody: {
                    success: true,
                    message: 'Subscription plan created successfully',
                    data: formattedResponse
                }
            };

        } catch (error) {
            const err = logError('createSubscriptionPlan', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error creating subscription plan',
                    error: err.message
                }
            };
        }
    }

    createPredefinedPlans = async (request, context) => {
        try {
            const predefinedPlans = [
                {
                    id: 'pro',
                    name: 'Pro Plan',
                    price: 10,
                    features: [
                        { id: 'f1', name: 'Advanced Diet Plan Generation' },
                        { id: 'f2', name: 'Unlimited Workout Plans' },
                        { id: 'f3', name: '24/7 Health Monitoring' },
                        { id: 'f4', name: 'Personal Coach Support' },
                    ],
                    currencyUnit: 'USD',
                    currencySymbol: '$'
                },
                {
                    id: 'pro-plus',
                    name: 'Pro Plus',
                    price: 20,
                    isBestValue: true,
                    features: [
                        { id: 'f1', name: 'Everything in Pro Plan' },
                        { id: 'f2', name: '4 Doctor Consultations' },
                    ],
                    additionalInfo: 'Additional Consultations $2 each',
                    currencyUnit: 'USD',
                    currencySymbol: '$'
                }
            ];

            // Delete existing plans if any
            await Subscription.deleteMany({});

            // Create all predefined plans
            const createdPlans = await Promise.all(
                predefinedPlans.map(async (plan) => {
                    const subscription = new Subscription({
                        type: {
                            id: plan.id,
                            name: plan.name,
                            price: plan.price,
                            features: plan.features,
                            ...(plan.isBestValue && { isBestValue: plan.isBestValue }),
                            ...(plan.additionalInfo && { additionalInfo: plan.additionalInfo })
                        },
                        currencyUnit: plan.currencyUnit,
                        currencySymbol: plan.currencySymbol
                    });
                    return await subscription.save();
                })
            );

            // Format the response
            const formattedPlans = createdPlans.map(plan => ({
                id: plan.type.id,
                name: plan.type.name,
                price: plan.type.price,
                features: plan.type.features,
                ...(plan.type.isBestValue && { isBestValue: plan.type.isBestValue }),
                ...(plan.type.additionalInfo && { additionalInfo: plan.type.additionalInfo })
            }));

            return {
                status: 201,
                jsonBody: {
                    success: true,
                    message: 'Predefined subscription plans created successfully',
                    data: formattedPlans
                }
            };

        } catch (error) {
            const err = logError('createPredefinedPlans', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error creating predefined subscription plans',
                    error: err.message
                }
            };
        }
    }

    subscribeUser = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const { isSubscribed, SubscriptionDate, subscriptionTransactionId, coupon, planAmmount } = await request.json() || {};

            if (!subscriptionTransactionId || !SubscriptionDate) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Subscription date and transaction ID are required'
                    }
                };
            }

            const user = await User.findById(userId);

            if (!user) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'user not found'
                    }
                };
            }

            const couponUsed = await Coupon.findOne({ code: coupon });

            if (!couponUsed) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'Coupon not found'
                    }
                };
            }

            // Check if user has already used this coupon
            if (couponUsed.usedBy.includes(userId)) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Coupon already used by this user'
                    }
                };
            }

            // Add user to usedBy array
            couponUsed.usedBy.push(userId);

            // Save changes to database with await
            await couponUsed.save();

            // Update the fields
            user.couponCode = coupon;
            user.couponLabel = couponUsed.label;
            user.couponDiscount = couponUsed.discount;
            user.subscriptionPaymentAmount = planAmmount;
            user.isSubscribed = isSubscribed !== undefined ? isSubscribed : true;
            user.SubscriptionDate = new Date(SubscriptionDate);
            user.subscriptionTransactionId = subscriptionTransactionId;
            user.updatedAt = Date.now();

            // Save the updated subscription
            const updatedSubscription = await user.save();

            context.log("Subscription Updated for ", user, "Successfully");

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'User subscribed successfully',
                    data: {
                        isSubscribed: updatedSubscription.isSubscribed,
                        SubscriptionDate: updatedSubscription.SubscriptionDate,
                        subscriptionTransactionId: updatedSubscription.subscriptionTransactionId
                    }
                }
            };
        } catch (error) {
            const err = logError('subscribeUser', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error subscribing user',
                    error: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new SubscriptionController();