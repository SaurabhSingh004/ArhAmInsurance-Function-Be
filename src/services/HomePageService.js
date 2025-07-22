const { logError } = require('../utils/logError');
const WellnessService = require('../services/WellnessService');
const ChecklistService = require('../services/ChecklistService');
const GoalsService = require('../services/GoalsService');
const User = require('../models/userProfile');
const Coupon = require('../models/coupon');
const BuildFunctionality = require('../models/buildFunctionality');
class HomePageService {
    static async getHomeData(user) {
        if (!user?._id) {
            throw new Error('User ID is required');
        }

        try {
            // Fetch data from all required services
            const [wellnessScore, weightGoal, checklists] = await Promise.all([
                WellnessService.getUserWellnessScore(user._id),
                GoalsService.getCurrentGoal(user._id),
                ChecklistService.getTodayTasks(user._id)
            ]);
            console.log(" user goal", weightGoal);
            let daysRemaining = -1;
            if (weightGoal) {
                const currentDate = new Date();
                const endDate = new Date(weightGoal.endDate);
                daysRemaining = Math.max(0, Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24)));
            }

            // Format and return the combined response
            return {
                wellnessScore: {
                    current: wellnessScore.data.wellnessScore,
                    previous: wellnessScore.data.prevWellnessScore,
                    change: Number((wellnessScore.data.wellnessScore - wellnessScore.data.prevWellnessScore).toFixed(2))
                },
                weightGoal: (weightGoal == null) ? {} : {
                    target: weightGoal?.target,
                    current: user?.weight,
                    status: weightGoal?.status,
                    daysRemaining
                },
                checklist: {
                    totalTasks: checklists.totalTasksCount,
                    completedTasks: checklists.completedTasksCount,
                    tasks: checklists.tasks.slice(0, 4).map(task => ({
                        title: task.title,
                        name: task.name,
                        isCompleted: task.isCompleted
                    }))
                }
            };
        } catch (error) {
            console.log(error);
            throw logError('getHomeData', error, { user });
        }
    }

    static async getAdminDashboardData(userId) {
        try {
            // Total number of users
            const userCount = await User.countDocuments();

            // Total number of coupons
            const couponCount = await Coupon.countDocuments();

            // Number of users with isSubscribed true
            const subscribedUsersCount = await User.countDocuments({ isSubscribed: true });

            // Total number of builds
            const totalBuilds = await BuildFunctionality.countDocuments();

            const couponUsed = await Coupon.countDocuments({
                "usedBy.0": { $exists: true }
            });

            const activeCoupons = await Coupon.countDocuments({ isActive: true });

            const aggregateResult = await Coupon.aggregate([
                {
                    $project: {
                        usageCount: { $size: "$usedBy" }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalUsage: { $sum: "$usageCount" }
                    }
                }
            ]);

            const totalUsage = aggregateResult.length > 0 ? aggregateResult[0].totalUsage : 0;

            const totalRevenue = await User.aggregate([
                // Match only subscribed users
                { $match: { isSubscribed: true } },

                // Group all documents and calculate the sum
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: { $ifNull: ["$subscriptionPaymentAmount", 0] } }
                    }
                }
            ]);

            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Get the current build number
            const latestBuild = await BuildFunctionality.findOne().sort({ buildNumber: -1 });
            const currentBuildNumber = latestBuild ? latestBuild.buildNumber : null;

            return {
                user: user,
                userCount,
                couponCount,
                activeCoupons: activeCoupons,
                couponUsed: couponUsed,
                totalUsage: totalUsage,
                subscribedUsersCount,
                currentBuildNumber,
                totalBuilds,
                totalRevenue: totalRevenue[0].totalRevenue || 0,
            };
        } catch (error) {
            console.error('Error retrieving home data:', error);
            throw error;
        }
    }
}

module.exports = HomePageService;