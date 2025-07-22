const BodyCompositionService = require('../services/BodyCompositionService');
const { logError } = require('../utils/logError');

class BodyCompositionController {

  /**
   * Create a new body composition entry
   * POST /api/body-composition
   */
  createEntry = async (request, context) => {
    try {
      const reqData = await request.json();
      const entryData = reqData || {};
      const userId = context.user?._id;

      if (!userId) {
        return {
          status: 401,
          jsonBody: {
            success: false,
            message: 'User not authenticated'
          }
        };
      }

      const createdEntry = await BodyCompositionService.createEntry(
          userId,
          reqData?.profileId,
          entryData
      );

      return {
        status: 201,
        jsonBody: {
          success: true,
          message: 'Body composition entry created successfully',
          data: createdEntry
        }
      };

    } catch (error) {
      context.error('Error creating body composition entry:', error);
      const err = logError('createEntry', error, { userId: context.user?._id });
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: err.message || 'Failed to create body composition entry',
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
      };
    }
  }

  /**
   * Update an existing body composition entry
   * PUT /api/body-composition/:id
   */
  updateEntry = async (request, context) => {
    try {

      const { id } = request.params || {};
      const updateData = await request.json() || {};
      const userId = context.user?._id;

      if (!userId) {
        return {
          status: 401,
          jsonBody: {
            success: false,
            message: 'User not authenticated'
          }
        };
      }

      if (!id) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: 'Entry ID is required'
          }
        };
      }

      const updatedEntry = await BodyCompositionService.updateEntry(id, userId, updateData);

      return {
        status: 200,
        jsonBody: {
          success: true,
          message: 'Body composition entry updated successfully',
          data: updatedEntry
        }
      };

    } catch (error) {
      context.error('Error updating body composition entry:', error);
      const err = logError('updateEntry', error, {
        userId: context.user?._id,
        entryId: request.params?.id
      });
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: err.message || 'Failed to update body composition entry',
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
      };
    }
  }

  /**
   * Get latest body composition entry(ies)
   * GET /api/body-composition/latest
   */
  getLatestEntries = async (request, context) => {
    try {
      const userId = context.user?._id;

      if (!userId) {
        return {
          status: 401,
          jsonBody: {
            success: false,
            message: 'User not authenticated'
          }
        };
      }

      const { profileId } = request.query || {};
      const entries = await BodyCompositionService.getLatestEntries(userId, profileId);
      context.log('Latest body composition entries:', entries);

      if (entries.length === 0) {
        return {
          status: 404,
          jsonBody: {
            success: false,
            message: 'No body composition entries found'
          }
        };
      }

      return {
        status: 200,
        jsonBody: {
          success: true,
          message: `Retrieved ${entries.length} latest entr${entries.length === 1 ? 'y' : 'ies'}`,
          data: {
            entries,
            count: entries.length,
            hasComparison: entries.length === 2
          }
        }
      };

    } catch (error) {
      context.error('Error fetching latest entries:', error);
      const err = logError('getLatestEntries', error, { userId: context.user?._id });
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: err.message || 'Failed to fetch latest entries',
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
      };
    }
  }

  /**
   * Get current day body composition data
   * GET /api/body-composition/current
   */
  getCurrentDayData = async (request, context) => {
    try {
      const userId = context.user?._id;

      if (!userId) {
        return {
          status: 401,
          jsonBody: {
            success: false,
            message: 'User not authenticated'
          }
        };
      }

      const { profileId } = request.query || {};
      const currentData = await BodyCompositionService.getCurrentDayData(userId, profileId);
      context.log('Current day body composition data:', currentData);

      return {
        status: 200,
        jsonBody: {
          success: true,
          message: 'Current day body composition data retrieved',
          data: currentData
        }
      };

    } catch (error) {
      context.error('Error fetching current day data:', error);
      const err = logError('getCurrentDayData', error, { userId: context.user?._id });
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: err.message || 'Failed to fetch current day data',
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
      };
    }
  }

  /**
   * Get entries for graphing
   * GET /api/body-composition/graph
   */
  getEntriesForGraph = async (request, context) => {
    try {
      const userId = context.user?._id;

      if (!userId) {
        return {
          status: 401,
          jsonBody: {
            success: false,
            message: 'User not authenticated'
          }
        };
      }

      const { timeline, fields, profileId } = request.query || {};

      if (!timeline) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: 'Timeline parameter is required'
          }
        };
      }

      if (!['daily', 'weekly', 'monthly', 'yearly'].includes(timeline)) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: 'Timeline must be daily, weekly, monthly, or yearly'
          }
        };
      }

      // Parse fields if provided
      let selectedFields = null;
      if (fields) {
        selectedFields = fields.split(',').map(field => field.trim());
      }

      const graphData = await BodyCompositionService.getEntriesForGraph(
          timeline,
          userId,
          profileId,
          selectedFields
      );
      context.log(`Graph data for ${timeline} timeline:`, graphData);

      if (graphData.totalEntries === 0) {
        return {
          status: 404,
          jsonBody: {
            success: false,
            message: `No entries found for ${timeline} timeline`
          }
        };
      }

      return {
        status: 200,
        jsonBody: {
          success: true,
          message: `Retrieved graph data for ${timeline} timeline`,
          data: graphData
        }
      };

    } catch (error) {
      context.error('Error fetching graph data:', error);
      const err = logError('getEntriesForGraph', error, { userId: context.user?._id });
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: err.message || 'Failed to fetch graph data',
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
      };
    }
  }

  /**
   * Get body composition statistics and trends
   * GET /api/body-composition/stats
   */
  getBodyCompositionStats = async (request, context) => {
    try {
      const userId = context.user?._id;

      if (!userId) {
        return {
          status: 401,
          jsonBody: {
            success: false,
            message: 'User not authenticated'
          }
        };
      }

      const { range = '30d', profileId } = request.query || {};

      if (!['7d', '30d', '90d', '1y'].includes(range)) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: 'Range must be 7d, 30d, 90d, or 1y'
          }
        };
      }

      const stats = await BodyCompositionService.getBodyCompositionStats(userId, profileId, range);

      return {
        status: 200,
        jsonBody: {
          success: true,
          message: `Retrieved body composition statistics for ${range}`,
          data: stats
        }
      };

    } catch (error) {
      context.error('Error fetching body composition stats:', error);
      const err = logError('getBodyCompositionStats', error, { userId: context.user?._id });
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: err.message || 'Failed to fetch body composition statistics',
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
      };
    }
  }

  /**
   * Get body composition trends and analysis
   * GET /api/body-composition/trends
   */
  getTrends = async (request, context) => {
    try {
      const userId = context.user?._id;

      if (!userId) {
        return {
          status: 401,
          jsonBody: {
            success: false,
            message: 'User not authenticated'
          }
        };
      }

      const { range = '30d', fields } = request.query || {};

      if (!['30d', '90d', '1y'].includes(range)) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: 'Range must be 30d, 90d, or 1y'
          }
        };
      }

      let selectedFields = null;
      if (fields) {
        selectedFields = fields.split(',').map(field => field.trim());
      }

      const trends = await BodyCompositionService.getTrends(userId, range, selectedFields);

      return {
        status: 200,
        jsonBody: {
          success: true,
          message: `Retrieved body composition trends for ${range}`,
          data: trends
        }
      };

    } catch (error) {
      context.error('Error fetching trends:', error);
      const err = logError('getTrends', error, { userId: context.user?._id });
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: err.message || 'Failed to fetch trends',
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
      };
    }
  }

  /**
   * Get all entries with pagination
   * GET /api/body-composition
   */
  getAllEntries = async (request, context) => {
    try {
      const userId = context.user?._id;

      if (!userId) {
        return {
          status: 401,
          jsonBody: {
            success: false,
            message: 'User not authenticated'
          }
        };
      }

      const {
        page = 1,
        limit = 50,
        sortBy = 'measurementDate',
        sortOrder = 'desc'
      } = request.query || {};

      // Validate pagination parameters
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: 'Page must be a positive integer'
          }
        };
      }

      if (limitNum < 1 || limitNum > 100) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: 'Limit must be between 1 and 100'
          }
        };
      }

      if (!['asc', 'desc'].includes(sortOrder)) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: 'Sort order must be asc or desc'
          }
        };
      }

      const result = await BodyCompositionService.getAllEntries(
          userId,
          pageNum,
          limitNum,
          sortBy,
          sortOrder
      );

      return {
        status: 200,
        jsonBody: {
          success: true,
          message: `Retrieved ${result.entries.length} entries`,
          data: result
        }
      };

    } catch (error) {
      context.error('Error fetching all entries:', error);
      const err = logError('getAllEntries', error, { userId: context.user?._id });
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: err.message || 'Failed to fetch entries',
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
      };
    }
  }

  /**
   * Get available fields for graphing
   * GET /api/body-composition/fields
   */
  getAvailableFields = async (request, context) => {
    try {
      const fields = {
        weight: ['weight_kg', 'weight_lb', 'weight_st'],
        composition: [
          'bodyFatPercent',
          'subcutaneousFatPercent',
          'visceralFat',
          'musclePercent',
          'moisturePercent',
          'proteinPercent',
          'smPercent',
          'boneMass'
        ],
        health: [
          'bmi',
          'bmr',
          'physicalAge',
          'bodyScore'
        ],
        technical: [
          'imp',
          'obesityDegree'
        ]
      };

      return {
        status: 200,
        jsonBody: {
          success: true,
          message: 'Available fields for graphing',
          data: {
            fields,
            allFields: Object.values(fields).flat(),
            categories: Object.keys(fields)
          }
        }
      };

    } catch (error) {
      context.error('Error fetching available fields:', error);
      const err = logError('getAvailableFields', error, { userId: context.user?._id });
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: 'Failed to fetch available fields',
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
      };
    }
  }

  /**
   * Delete an entry
   * DELETE /api/body-composition/:id
   */
  deleteEntry = async (request, context) => {
    try {
      const { id } = request.params || {};
      const userId = context.user?._id;

      if (!userId) {
        return {
          status: 401,
          jsonBody: {
            success: false,
            message: 'User not authenticated'
          }
        };
      }

      if (!id) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: 'Entry ID is required'
          }
        };
      }

      const deletedEntry = await BodyCompositionService.deleteEntry(id, userId);

      return {
        status: 200,
        jsonBody: {
          success: true,
          message: 'Body composition entry deleted successfully',
          data: { deletedId: id }
        }
      };

    } catch (error) {
      context.error('Error deleting entry:', error);
      const err = logError('deleteEntry', error, {
        userId: context.user?._id,
        entryId: request.params?.id
      });
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: err.message || 'Failed to delete entry',
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
      };
    }
  }
}

// Export the controller instance
module.exports = new BodyCompositionController();
