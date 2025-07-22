const HomePageService = require('../services/HomePageService');
const {logError} = require('../utils/logError');

class HomePageController {

    getHomeData = async (request, context) => {
        try {
            const user = context.user;
            
            if (!user) {
                context.log("No user found in request");
                return {
                    status: 401,
                    jsonBody: {
                        success: false,
                        message: 'User not authenticated'
                    }
                };
            }

            const result = await HomePageService.getHomeData(user);
            
            // Check if there are no tasks in the checklist
            if (result.checklist.tasks.length === 0) {
                return {
                    status: 200,
                    jsonBody: {
                        success: true,
                        data: result,
                        message: 'Home data retrieved successfully. No tasks found for today.'
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data: result,
                    message: 'Home data retrieved successfully'
                }
            };

        } catch (error) {
            // Handle specific error for missing user ID
            if (error.message === 'User ID is required') {
                const err = logError('getHomeData', error, { userId: context.user?._id });
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        message: 'User ID is required'
                    }
                };
            }

            // Handle other errors
            const err = logError('getHomeData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch home data',
                    error: err.message
                }
            };
        }
    }

    getAdminDashboardData = async (request, context) => {
        try {
            const userId = context.user?._id;
            
            if (!userId) {
                context.log("No user ID found in request");
                return {
                    status: 401,
                    jsonBody: { message: "User not authenticated" }
                };
            }

            const data = await HomePageService.getAdminDashboardData(userId);
            
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    data
                }
            };
        } catch (error) {
            const err = logError('getAdminDashboardData', error, { userId: context.user?._id });
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Failed to fetch admin dashboard data',
                    error: err.message
                }
            };
        }
    }
}

// Export the controller instance
module.exports = new HomePageController();