const BuildFunctionalityService = require('../services/BuildFunctionalityService');

class BuildFunctionalityController {

  /**
   * Add or update build functionality features
   */
  addBuildFunctionality = async (request, context) => {
    try {
      const { buildNumber, features } = await request.json() || {};

      const result = await BuildFunctionalityService.addBuildFunctionality(buildNumber, features);

      if (result.isUpdate) {
        return {
          status: 200,
          jsonBody: {
            success: true,
            message: 'Build functionality updated',
            data: result.data
          }
        };
      } else {
        return {
          status: 201,
          jsonBody: {
            success: true,
            message: 'Build functionality created',
            data: result.data
          }
        };
      }
    } catch (error) {
      context.error('Error adding build functionality:', error);
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: 'Failed to add build functionality',
          error: error.message
        }
      };
    }
  }

  /**
   * Get build functionality features by build number
   */
  getBuildFunctionality = async (request, context) => {
    try {
      const { buildNumber } = request.params || {};

      const formattedFeatures = await BuildFunctionalityService.getBuildFunctionality(buildNumber);

      return {
        status: 200,
        jsonBody: {
          success: true,
          data: formattedFeatures,
          message: 'Build functionality retrieved'
        }
      };
    } catch (error) {
      context.error('Error getting build functionality:', error);
      
      if (error.message === 'Build number is required') {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: error.message
          }
        };
      }
      
      if (error.message === 'Build not found') {
        return {
          status: 404,
          jsonBody: {
            success: false,
            message: error.message
          }
        };
      }

      return {
        status: 500,
        jsonBody: {
          success: false,
          message: 'Failed to get build functionality',
          error: error.message
        }
      };
    }
  }

  toggleFeature = async (request, context) => {
    try {
      const { buildId, featureName } = request.params || {};

      const result = await BuildFunctionalityService.toggleFeature(buildId, featureName);

      return {
        status: 200,
        jsonBody: {
          success: true,
          data: result,
          message: 'Feature toggled successfully'
        }
      };
    } catch (error) {
      context.error('Error in toggleFeature:', error);
      
      if (error.message === 'Build ID and Feature name are required' || 
          error.message === 'Invalid build ID format') {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: error.message
          }
        };
      }
      
      if (error.message === 'Build not found') {
        return {
          status: 404,
          jsonBody: {
            success: false,
            message: error.message
          }
        };
      }

      return {
        status: 500,
        jsonBody: {
          success: false,
          message: error.message || 'An error occurred while toggling the feature'
        }
      };
    }
  }

  deleteFeature = async (request, context) => {
    try {
      const { buildId, featureName } = request.params || {};

      const result = await BuildFunctionalityService.deleteFeature(buildId, featureName);

      return {
        status: 200,
        jsonBody: {
          success: true,
          data: result.data,
          message: `Feature "${result.deletedFeature}" has been successfully removed`
        }
      };
    } catch (error) {
      context.error('Error in deleteFeature:', error);
      
      if (error.message === 'Build ID and feature name are required' || 
          error.message === 'Invalid build ID format') {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: error.message
          }
        };
      }
      
      if (error.message === 'Build not found' || 
          error.message === 'No features found for this build' ||
          error.message.includes('does not exist for this build')) {
        return {
          status: 404,
          jsonBody: {
            success: false,
            message: error.message
          }
        };
      }

      return {
        status: 500,
        jsonBody: {
          success: false,
          message: error.message || 'An error occurred while deleting the feature'
        }
      };
    }
  }

  getAllBuilds = async (request, context) => {
    try {
      const formattedBuilds = await BuildFunctionalityService.getAllBuilds();

      return {
        status: 200,
        jsonBody: {
          success: true,
          data: formattedBuilds,
          message: 'Build functionality retrieved'
        }
      };
    } catch (error) {
      context.error('Error getting build functionality:', error);
      
      if (error.message === 'Build not found') {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: error.message
          }
        };
      }

      return {
        status: 500,
        jsonBody: {
          success: false,
          message: 'Failed to get build functionality',
          error: error.message
        }
      };
    }
  }

  /**
   * Check if a specific feature is enabled for a build
   */
  isFeatureEnabled = async (request, context) => {
    try {
      const { buildNumber, featureName } = request.params || {};

      const result = await BuildFunctionalityService.isFeatureEnabled(buildNumber, featureName);

      return {
        status: 200,
        jsonBody: {
          success: true,
          data: result
        }
      };
    } catch (error) {
      context.error('Error checking feature:', error);
      
      if (error.message === 'Both build number and feature name are required') {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: error.message
          }
        };
      }
      
      if (error.message === 'Build not found') {
        return {
          status: 404,
          jsonBody: {
            success: false,
            message: error.message
          }
        };
      }

      return {
        status: 500,
        jsonBody: {
          success: false,
          message: 'Failed to check feature',
          error: error.message
        }
      };
    }
  }
}

// Export the controller instance
module.exports = new BuildFunctionalityController();