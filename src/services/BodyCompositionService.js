// services/BodyCompositionService.js
const BodyComposition = require('../models/bodyComposition');
const mongoose = require('mongoose');

class BodyCompositionService {

  /**
   * Create a new body composition entry
   * @param {String} userId - User ID
   * @param {Object} data - Body composition data
   * @returns {Promise<Object>} Created entry
   */
  async createEntry(userId, profileId, data) {
    try {
      // Validate required fields
      const requiredFields = ['weight_kg', 'bmi', 'bodyFatPercent', 'time'];
      for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Add userId and measurementDate
      const entryData = {
        ...data,
        userId,
        profileId,
        measurementDate: new Date(data.time * 1000) // Convert unix timestamp to Date
      };

      const entry = new BodyComposition(entryData);
      const savedEntry = await entry.save();
      return savedEntry;
    } catch (error) {
      throw new Error(`Failed to create body composition entry: ${error.message}`);
    }
  }

  /**
   * Update an existing body composition entry
   * @param {String} entryId - Entry ID
   * @param {String} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated entry
   */
  async updateEntry(entryId, userId, updateData) {
    try {
      const entry = await BodyComposition.findOne({ _id: entryId, userId });

      if (!entry) {
        throw new Error('Body composition entry not found');
      }

      // Update measurementDate if time is provided
      if (updateData.time) {
        updateData.measurementDate = new Date(updateData.time * 1000);
      }

      const updatedEntry = await BodyComposition.findByIdAndUpdate(
        entryId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      return updatedEntry;
    } catch (error) {
      throw new Error(`Failed to update body composition entry: ${error.message}`);
    }
  }

  /**
   * Get the latest entry(ies) - returns 1 if only one exists, otherwise returns last 2
   * @param {String} userId - User ID
   * @returns {Promise<Array>} Latest entry or entries
   */
  async getLatestEntries(userId, profileId) {
    try {
      const query = { userId, profileId };

      // Get total count
      const totalCount = await BodyComposition.countDocuments(query);

      if (totalCount === 0) {
        return [];
      }

      // If only one entry exists, return it
      // Otherwise, return the last 2 entries
      const limit = totalCount === 1 ? 1 : 2;

      const entries = await BodyComposition
        .find(query)
        .sort({ measurementDate: -1 })
        .limit(limit)
        .lean();

      return entries;
    } catch (error) {
      throw new Error(`Failed to fetch latest entries: ${error.message}`);
    }
  }

  /**
   * Get current day body composition data
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Current day data
   */
  async getCurrentDayData(userId, profileId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const currentEntry = await BodyComposition.findOne({
        userId,
        profileId,
        measurementDate: {
          $gte: today,
          $lt: endOfDay
        }
      }).sort({ measurementDate: -1 }).lean();

      if (!currentEntry) {
        return {
          hasEntry: false,
          date: today.toISOString().split('T')[0],
          message: 'No body composition data recorded for today'
        };
      }

      return {
        hasEntry: true,
        date: today.toISOString().split('T')[0],
        entry: currentEntry
      };
    } catch (error) {
      throw new Error(`Failed to fetch current day data: ${error.message}`);
    }
  }

  /**
   * Get body composition statistics
   * @param {String} userId - User ID
   * @param {String} range - Time range ('7d', '30d', '90d', '1y')
   * @returns {Promise<Object>} Statistics
   */
  async getBodyCompositionStats(userId, profileId, range = '30d') {
    try {
      const dateRange = this.getDateRange(range);
      const query = {
        userId,
        profileId,
        measurementDate: {
          $gte: dateRange.start,
          $lte: dateRange.end
        }
      };

      const entries = await BodyComposition.find(query).sort({ measurementDate: 1 }).lean();

      if (entries.length === 0) {
        return {
          range,
          totalEntries: 0,
          message: 'No entries found for the specified period'
        };
      }

      // Calculate statistics
      const stats = this.calculateStatistics(entries);

      // Calculate trends
      const trends = this.calculateTrends(entries);

      return {
        range,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end
        },
        totalEntries: entries.length,
        statistics: stats,
        trends,
        latestEntry: entries[entries.length - 1],
        oldestEntry: entries[0]
      };
    } catch (error) {
      throw new Error(`Failed to fetch body composition statistics: ${error.message}`);
    }
  }

  /**
   * Get trends analysis for body composition data
   * @param {String} userId - User ID
   * @param {String} range - Time range
   * @param {Array} fields - Fields to analyze
   * @returns {Promise<Object>} Trends data
   */
  async getTrends(userId, range = '30d', fields = null) {
    try {
      const dateRange = this.getDateRange(range);
      const query = {
        userId,
        measurementDate: {
          $gte: dateRange.start,
          $lte: dateRange.end
        }
      };

      const entries = await BodyComposition.find(query).sort({ measurementDate: 1 }).lean();

      if (entries.length < 2) {
        return {
          range,
          message: 'Insufficient data for trend analysis (minimum 2 entries required)',
          trends: {}
        };
      }

      const defaultFields = ['weight_kg', 'bmi', 'bodyFatPercent', 'musclePercent', 'visceralFat'];
      const selectedFields = fields || defaultFields;

      const trends = {};

      selectedFields.forEach(field => {
        trends[field] = this.analyzeTrendForField(entries, field);
      });

      return {
        range,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end
        },
        totalEntries: entries.length,
        fieldsAnalyzed: selectedFields,
        trends,
        period: {
          days: Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24))
        }
      };
    } catch (error) {
      throw new Error(`Failed to analyze trends: ${error.message}`);
    }
  }

  /**
   * Get entries for graphing based on timeline
   * @param {String} timeline - 'daily', 'weekly', 'monthly', 'yearly'
   * @param {String} userId - User ID
   * @param {Array} fields - Fields to include in response
   * @returns {Promise<Object>} Graph data organized by fields
   */
  async getEntriesForGraph(timeline, userId, profileId, fields = null) {
    try {
      const dateRange = this.getDateRange(timeline);
      console.log(`Fetching entries for timeline: ${timeline}, date range: ${dateRange.start} to ${dateRange.end}`);
      const query = {
        userId,
        profileId,
        measurementDate: {
          $gte: dateRange.start,
          $lte: dateRange.end
        }
      };

      // Define graphable fields if not provided
      const defaultFields = [
        'weight_kg', 'bmi', 'bodyFatPercent', 'subcutaneousFatPercent',
        'visceralFat', 'musclePercent', 'bmr', 'boneMass', 'moisturePercent',
        'physicalAge', 'proteinPercent', 'smPercent', 'bodyScore'
      ];

      const selectedFields = fields || defaultFields;

      // Build projection object
      const projection = { measurementDate: 1, time: 1 };
      selectedFields.forEach(field => {
        projection[field] = 1;
      });

      const entries = await BodyComposition
        .find(query, projection)
        .sort({ measurementDate: 1 })
        .lean();
      console.log(`Fetched ${entries.length} entries for timeline: ${timeline}`);
      // Group data by intervals for better visualization
      const groupedData = this.groupDataByInterval(entries, timeline);

      console.log(`grouped data for graphing: ${JSON.stringify(groupedData)}`);
      // Transform data for graphing
      const graphData = this.transformForGraphing(groupedData, selectedFields);
      return {
        timeline,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end
        },
        totalEntries: entries.length,
        data: graphData
      };
    } catch (error) {
      throw new Error(`Failed to fetch entries for graph: ${error.message}`);
    }
  }

  /**
   * Get all entries with pagination and sorting
   * @param {String} userId - User ID
   * @param {Number} page - Page number
   * @param {Number} limit - Items per page
   * @param {String} sortBy - Field to sort by
   * @param {String} sortOrder - Sort order ('asc' or 'desc')
   * @returns {Promise<Object>} Paginated entries
   */
  async getAllEntries(userId, page = 1, limit = 50, sortBy = 'measurementDate', sortOrder = 'desc') {
    try {
      const query = { userId };
      const skip = (page - 1) * limit;
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const [entries, total] = await Promise.all([
        BodyComposition
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        BodyComposition.countDocuments(query)
      ]);

      return {
        entries,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalEntries: total,
          hasNext: skip + entries.length < total,
          hasPrev: page > 1,
          limit
        },
        sorting: {
          sortBy,
          sortOrder
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch entries: ${error.message}`);
    }
  }

  /**
   * Delete an entry
   * @param {String} entryId - Entry ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Deleted entry
   */
  async deleteEntry(entryId, userId) {
    try {
      const deletedEntry = await BodyComposition.findOneAndDelete({
        _id: entryId,
        userId
      });

      if (!deletedEntry) {
        throw new Error('Body composition entry not found');
      }

      return deletedEntry;
    } catch (error) {
      throw new Error(`Failed to delete entry: ${error.message}`);
    }
  }

  /**
   * Get date range based on timeline or range
   * @param {String} timelineOrRange - Timeline or range string
   * @returns {Object} Start and end dates
   */
  getDateRange(timelineOrRange) {
    const now = new Date();
    const start = new Date();

    switch (timelineOrRange.toLowerCase()) {
      case 'daily':
      case '1d':
        start.setHours(0, 0, 0, 0); // Start of today
        break;
      case 'weekly':
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case 'monthly':
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case 'yearly':
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        throw new Error(`Invalid timeline/range: ${timelineOrRange}. Use 'daily', 'weekly', 'monthly', 'yearly', '7d', '30d', '90d', or '1y'`);
    }

    return { start, end: now };
  }

  /**
   * Calculate statistics for entries
   * @param {Array} entries - Body composition entries
   * @returns {Object} Statistics
   */
  calculateStatistics(entries) {
    const numericFields = [
      'weight_kg', 'bmi', 'bodyFatPercent', 'musclePercent',
      'visceralFat', 'bmr', 'moisturePercent', 'physicalAge', 'bodyScore'
    ];

    const stats = {};

    numericFields.forEach(field => {
      const values = entries
        .map(entry => entry[field])
        .filter(val => val !== undefined && val !== null && !isNaN(val));

      if (values.length > 0) {
        stats[field] = {
          current: values[values.length - 1],
          min: Math.min(...values),
          max: Math.max(...values),
          average: Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 100) / 100,
          change: values.length > 1 ? Math.round((values[values.length - 1] - values[0]) * 100) / 100 : 0,
          changePercent: values.length > 1 && values[0] !== 0
            ? Math.round(((values[values.length - 1] - values[0]) / values[0]) * 10000) / 100
            : 0
        };
      }
    });

    return stats;
  }

  /**
   * Calculate trends for entries
   * @param {Array} entries - Body composition entries
   * @returns {Object} Trends
   */
  calculateTrends(entries) {
    if (entries.length < 2) return {};

    const trends = {};
    const numericFields = ['weight_kg', 'bmi', 'bodyFatPercent', 'musclePercent', 'visceralFat'];

    numericFields.forEach(field => {
      trends[field] = this.analyzeTrendForField(entries, field);
    });

    return trends;
  }

  /**
   * Analyze trend for a specific field
   * @param {Array} entries - Body composition entries
   * @param {String} field - Field to analyze
   * @returns {Object} Trend analysis
   */
  analyzeTrendForField(entries, field) {
    const values = entries
      .map((entry, index) => ({ value: entry[field], index, date: entry.measurementDate }))
      .filter(item => item.value !== undefined && item.value !== null && !isNaN(item.value));

    if (values.length < 2) {
      return {
        trend: 'insufficient_data',
        direction: 'neutral',
        change: 0,
        changePercent: 0
      };
    }

    const firstValue = values[0].value;
    const lastValue = values[values.length - 1].value;
    const change = lastValue - firstValue;
    const changePercent = firstValue !== 0 ? (change / firstValue) * 100 : 0;

    // Calculate trend direction
    let direction = 'neutral';
    if (Math.abs(changePercent) > 1) { // Only consider significant changes (>1%)
      direction = change > 0 ? 'increasing' : 'decreasing';
    }

    // Calculate volatility (standard deviation)
    const mean = values.reduce((sum, item) => sum + item.value, 0) / values.length;
    const variance = values.reduce((sum, item) => sum + Math.pow(item.value - mean, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);

    return {
      trend: direction,
      direction,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      dataPoints: values.length,
      timespan: {
        start: values[0].date,
        end: values[values.length - 1].date
      }
    };
  }

  /**
   * Group data by appropriate intervals
   * @param {Array} entries - Body composition entries
   * @param {String} timeline - Timeline type
   * @returns {Array} Grouped data
   */
  groupDataByInterval(entries, timeline) {
    if (timeline === 'daily') {
      // For daily, group by second
      return this.groupBySecond(entries);
    } else if (timeline === 'weekly') {
      // For weekly, group by day
      return this.groupByDay(entries);
    } else if (timeline === 'monthly') {
      // For monthly, group by day (or week if too many entries)
      return entries.length > 60 ? this.groupByWeek(entries) : this.groupByDay(entries);
    } else if (timeline === 'yearly') {
      // For yearly, group by month
      return this.groupByMonth(entries);
    }

    return entries;
  }

  /**
   * Group entries by second
   */
groupBySecond(entries) {
  const grouped = {};

  entries.forEach(entry => {
    const date = new Date(entry.measurementDate);
    const key = date.toLocaleTimeString(); // Local time format like "10:30:45 AM"
    
    grouped[key] = [entry]; // Each entry gets its own key
  });

  return Object.keys(grouped).map(key => ({
    interval: key,
    timestamp: grouped[key][0].measurementDate,
    data: this.averageGroupData(grouped[key])
  }));
}

  /**
   * Group entries by day
   */
  groupByDay(entries) {
    const grouped = {};

    entries.forEach(entry => {
      const date = new Date(entry.measurementDate);
      const key = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry);
    });

    return Object.keys(grouped).map(key => ({
      interval: key,
      timestamp: new Date(key),
      data: this.averageGroupData(grouped[key])
    }));
  }

  /**
   * Group entries by week
   */
  groupByWeek(entries) {
    const grouped = {};

    entries.forEach(entry => {
      const date = new Date(entry.measurementDate);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const key = weekStart.toISOString().split('T')[0];

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry);
    });

    return Object.keys(grouped).map(key => ({
      interval: `Week of ${key}`,
      timestamp: new Date(key),
      data: this.averageGroupData(grouped[key])
    }));
  }

  /**
   * Group entries by month
   */
  groupByMonth(entries) {
    const grouped = {};

    entries.forEach(entry => {
      const date = new Date(entry.measurementDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry);
    });

    return Object.keys(grouped).map(key => ({
      interval: key,
      timestamp: new Date(key + '-01'),
      data: this.averageGroupData(grouped[key])
    }));
  }

  /**
   * Average numerical data for grouped entries
   */
  averageGroupData(entries) {
    if (entries.length === 1) {
      return entries[0];
    }

    const averaged = { ...entries[0] };
    const numericFields = [
      'weight_kg', 'bmi', 'bodyFatPercent', 'subcutaneousFatPercent',
      'visceralFat', 'musclePercent', 'bmr', 'boneMass', 'moisturePercent',
      'physicalAge', 'proteinPercent', 'smPercent', 'bodyScore'
    ];

    numericFields.forEach(field => {
      if (entries.every(entry => entry[field] !== undefined)) {
        const sum = entries.reduce((acc, entry) => acc + entry[field], 0);
        averaged[field] = Math.round((sum / entries.length) * 100) / 100; // Round to 2 decimals
      }
    });

    return averaged;
  }

  /**
   * Transform grouped data for graphing
   */
  transformForGraphing(groupedData, fields) {
    const graphData = {};

    fields.forEach(field => {
      graphData[field] = groupedData.map(group => ({
        timestamp: group.timestamp,
        interval: group.interval,
        value: group.data[field],
        measurementDate: group.data.measurementDate
      })).filter(point => point.value !== undefined && point.value !== null);
    });

    return graphData;
  }
}

module.exports = new BodyCompositionService();