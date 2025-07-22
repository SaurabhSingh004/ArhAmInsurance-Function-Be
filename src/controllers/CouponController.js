const Coupon = require('../models/coupon');
const { logError } = require('../utils/logError');

// Function to generate a random 6-digit alphanumeric code
const generateCouponCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();  // Generates a random 6-character code
};

class CouponController {

    createCoupon = async (request, context) => {
        try {
            const { discount, label, count } = await request.json() || {};

            if (!discount || !count || count < 1) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: "Discount value and count are required, and count must be at least 1"
                    }
                };
            }

            let coupons = [];

            for (let i = 0; i < count; i++) {
                let uniqueCode;
                let isDuplicate = true;

                // Ensure unique coupon codes
                while (isDuplicate) {
                    uniqueCode = generateCouponCode();
                    const existingCoupon = await Coupon.findOne({ code: uniqueCode });
                    if (!existingCoupon) isDuplicate = false;
                }

                // Create coupon object
                const newCoupon = new Coupon({
                    code: uniqueCode,
                    discount: discount,
                    isActive: true,
                    label: label || "General Discount"
                });

                coupons.push(newCoupon);
            }

            // Insert all coupons in one query
            const createdCoupons = await Coupon.insertMany(coupons);

            return {
                status: 201,
                jsonBody: {
                    success: true,
                    message: `${count} Coupons created successfully`,
                    data: createdCoupons
                }
            };

        } catch (error) {
            const err = logError('createCoupon', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    editCoupon = async (request, context) => {
        try {
            const { codeId } = request.params || {};
            const { discount, isActive, label } = await request.json() || {};

            if (!codeId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Coupon ID is required'
                    }
                };
            }

            const updates = { discount, isActive, label };

            const coupon = await Coupon.findById(codeId);

            if (!coupon) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Coupon not found'
                    }
                };
            }

            // Update fields only if provided in request
            if (updates.discount !== undefined) coupon.discount = updates.discount;
            if (updates.isActive !== undefined) coupon.isActive = updates.isActive;
            if (updates.label !== undefined) coupon.label = updates.label;

            await coupon.save();

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: "Coupon Updated Successfully",
                    data: coupon
                }
            };
        } catch (error) {
            const err = logError('editCoupon', error, {
                userId: context.user?._id,
                codeId: request.params?.codeId
            });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    deactivateCoupon = async (request, context) => {
        try {
            const { codeId } = request.query || {};

            if (!codeId) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Coupon ID is required'
                    }
                };
            }

            const coupon = await Coupon.findById(codeId);

            if (!coupon) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Coupon not found'
                    }
                };
            }

            if (!coupon.isActive) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Coupon is already deactivated'
                    }
                };
            }

            coupon.isActive = !coupon.isActive;
            await coupon.save();

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: "Coupon deactivated successfully",
                    data: coupon
                }
            };
        } catch (error) {
            const err = logError('deactivateCoupon', error, {
                userId: context.user?._id,
                codeId: request.query?.codeId
            });
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    message: err.message
                }
            };
        }
    }

    getAllCoupons = async (request, context) => {
        try {
            // Get pagination parameters from query string
            const page = parseInt(request.query?.page) || 1;
            const limit = parseInt(request.query?.limit) || 10;
            const skip = (page - 1) * limit;

            // Validate pagination parameters
            if (page < 1) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Page must be a positive integer'
                    }
                };
            }

            if (limit < 1 || limit > 100) {
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'Limit must be between 1 and 100'
                    }
                };
            }

            // Get filter parameters
            const filterOptions = {};

            // Optional coupon code filter (case-insensitive partial match)
            if (request.query?.code) {
                filterOptions.code = { $regex: request.query.code, $options: 'i' };
            }

            // Optional discount amount filter
            if (request.query?.minDiscount) {
                filterOptions.discountAmount = { $gte: parseFloat(request.query.minDiscount) };
            }
            if (request.query?.maxDiscount) {
                filterOptions.discountAmount = {
                    ...filterOptions.discountAmount,
                    $lte: parseFloat(request.query.maxDiscount)
                };
            }

            // Optional active status filter
            if (request.query?.isActive !== undefined) {
                filterOptions.isActive = request.query.isActive === 'true';
            }

            // Optional expiry date filter
            if (request.query?.validUntil) {
                const today = new Date();
                if (request.query.validUntil === 'active') {
                    filterOptions.expiryDate = { $gt: today };
                } else if (request.query.validUntil === 'expired') {
                    filterOptions.expiryDate = { $lt: today };
                }
            }

            // Count total matching documents for pagination info
            const totalCoupons = await Coupon.countDocuments(filterOptions);

            // Fetch coupons with pagination
            const coupons = await Coupon.find(filterOptions)
                .populate({
                    path: 'usedBy',
                    select: 'email profile.name profile.age profile.gender'
                })
                .sort({ createdAt: -1 }) // Sort by newest first
                .skip(skip)
                .limit(limit);

            // Check if coupons exist
            if (!coupons || coupons.length === 0) {
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'No coupons found'
                    }
                };
            }

            // Calculate pagination info
            const totalPages = Math.ceil(totalCoupons / limit);

            // Return successful response with pagination metadata
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Coupons retrieved successfully',
                    data: coupons,
                    pagination: {
                        totalCoupons,
                        totalPages,
                        currentPage: page,
                        limit,
                        hasNextPage: page < totalPages,
                        hasPrevPage: page > 1
                    }
                }
            };
        } catch (error) {
            const err = logError('getAllCoupons', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Error fetching coupons',
                    error: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new CouponController();
