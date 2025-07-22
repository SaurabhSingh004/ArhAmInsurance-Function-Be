const { datacatalog } = require('googleapis/build/src/apis/datacatalog');
const FitnessData = require('../models/FitnessData');
const moment = require('moment');

class AppleHealthSyncService {
  /**
   * Group data by date for processing
   * @param {Array} hrData - Heart rate data
   * @param {Array} stepsData - Steps data
   * @param {Array} sleepData - Sleep data
   * @param {Array} oxygenData - Oxygen saturation data
   * @returns {Object} Data grouped by date
   */
  static groupDataByDate(hrData = [], stepsData = [], sleepData = [], oxygenData = []) {
    const groupedData = {};

    // Helper function to get date string (YYYY-MM-DD)
    const getDateString = (timestamp) => {
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    // Process HR data
    (hrData || []).forEach(item => {
      // Use startDate for grouping
      const dateStr = getDateString(item.startDate);

      if (!groupedData[dateStr]) {
        groupedData[dateStr] = { hr: [], sleep: [], steps: [], oxygen: [] };
      }

      groupedData[dateStr].hr.push(item);
    });

    // Process Sleep data
    (sleepData || []).forEach(item => {
      // Use startDate for grouping
      const dateStr = getDateString(item.startDate);

      if (!groupedData[dateStr]) {
        groupedData[dateStr] = { hr: [], sleep: [], steps: [], oxygen: [] };
      }

      groupedData[dateStr].sleep.push(item);
    });

    // Process Steps data
    (stepsData || []).forEach(item => {
      const dateStr = getDateString(item.startDate);

      if (!groupedData[dateStr]) {
        groupedData[dateStr] = { hr: [], sleep: [], steps: [], oxygen: [] };
      }

      groupedData[dateStr].steps.push(item);
    });

    // Process Oxygen data
    (oxygenData || []).forEach(item => {
      const dateStr = getDateString(item.startDate);

      if (!groupedData[dateStr]) {
        groupedData[dateStr] = { hr: [], sleep: [], steps: [], oxygen: [] };
      }

      groupedData[dateStr].oxygen.push(item);
    });

    return groupedData;
  }

  /**
   * Process heart rate data and update fitness record
   * @param {Object} fitnessRecord - Fitness data record
   * @param {Array} hrData - Heart rate data 
   */
  static processHeartRateData(fitnessRecord, hrData) {
    // Initialize heart rate object if it doesn't exist
    if (!fitnessRecord.heartRate) {
      fitnessRecord.heartRate = {
        readings: [],
        averageBpm: 0
      };
    }

    // Create a set of existing timestamps to avoid duplicates
    const existingTimestamps = new Set(
      fitnessRecord.heartRate.readings.map(reading => reading.timestamp.getTime())
    );

    // Process each heart rate reading
    hrData.forEach(item => {
      const timestamp = new Date(item.startDate);
      
      // Only add if this timestamp doesn't already exist
      if (!existingTimestamps.has(timestamp.getTime())) {
        fitnessRecord.heartRate.readings.push({
          timestamp,
          bpm: item.value
        });
        existingTimestamps.add(timestamp.getTime());
      }
    });

    // Recalculate average BPM if we have readings
    if (fitnessRecord.heartRate.readings.length > 0) {
      const sum = fitnessRecord.heartRate.readings.reduce((acc, reading) => acc + reading.bpm, 0);
      fitnessRecord.heartRate.averageBpm = Math.round(sum / fitnessRecord.heartRate.readings.length);
    }
  }

  /**
   * Process steps data and update fitness record
   * @param {Object} fitnessRecord - Fitness data record
   * @param {Array} stepsData - Steps data
   */
  static processStepsData(fitnessRecord, stepsData) {
    // Initialize steps object if it doesn't exist
    if (!fitnessRecord.steps) {
      fitnessRecord.steps = {
        totalSteps: 0,
        stepsByHour: [],
        totalDistance: 0,
        totalMoveMinutes: 0,
        averageStepLength: 0
      };
    }

    // Create a map of existing time ranges to avoid duplicates
    const existingTimeRanges = new Map();
    fitnessRecord.steps.stepsByHour.forEach((entry, index) => {
      const key = `${entry.startTime.getTime()}-${entry.endTime.getTime()}`;
      existingTimeRanges.set(key, index);
    });

    // Reset totals for recalculation
    fitnessRecord.steps.totalSteps = 0;
    fitnessRecord.steps.totalDistance = 0;
    fitnessRecord.steps.totalMoveMinutes = 0;

    // Process each steps entry
    stepsData.forEach(item => {
      const startTime = new Date(item.startDate);
      const endTime = new Date(item.endDate);
      const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
      const estimatedDistance = item.value * 0.762; // Same step length assumption as Google Fit
      const timeRangeKey = `${startTime.getTime()}-${endTime.getTime()}`;

      // Check if this time range already exists
      if (existingTimeRanges.has(timeRangeKey)) {
        // Update existing entry
        const index = existingTimeRanges.get(timeRangeKey);
        fitnessRecord.steps.stepsByHour[index].steps = item.value;
        fitnessRecord.steps.stepsByHour[index].distance = estimatedDistance;
        fitnessRecord.steps.stepsByHour[index].moveMinutes = durationMinutes;
      } else {
        // Add new entry
        fitnessRecord.steps.stepsByHour.push({
          startTime,
          endTime,
          steps: item.value,
          distance: estimatedDistance,
          moveMinutes: durationMinutes
        });
      }
    });
    
    // Recalculate totals
    fitnessRecord.steps.stepsByHour.forEach(entry => {
      fitnessRecord.steps.totalSteps += entry.steps;
      fitnessRecord.steps.totalDistance += entry.distance;
      fitnessRecord.steps.totalMoveMinutes += entry.moveMinutes;
    });

    // Recalculate average step length
    if (fitnessRecord.steps.totalSteps > 0) {
      fitnessRecord.steps.averageStepLength = fitnessRecord.steps.totalDistance / fitnessRecord.steps.totalSteps;
    }
  }

  /**
   * Process sleep data and update fitness record
   * @param {Object} fitnessRecord - Fitness data record
   * @param {Array} sleepData - Sleep data
   */
  static processSleepData(fitnessRecord, sleepData) {
    // Initialize sleep object if it doesn't exist
    if (!fitnessRecord.sleep) {
      fitnessRecord.sleep = {
        sessions: [],
        totalSleepDuration: 0
      };
    }

    // Create a map of existing time ranges to avoid duplicates
    const existingTimeRanges = new Map();
    fitnessRecord.sleep.sessions.forEach((session, index) => {
      const key = `${session.startTime.getTime()}-${session.endTime.getTime()}`;
      existingTimeRanges.set(key, index);
    });

    // Reset total duration for recalculation
    fitnessRecord.sleep.totalSleepDuration = 0;

    // Process each sleep session
    sleepData.forEach(item => {
      const startTime = new Date(item.startDate);
      const endTime = new Date(item.endDate);
      const duration = endTime.getTime() - startTime.getTime();
      const timeRangeKey = `${startTime.getTime()}-${endTime.getTime()}`;

      // Sleep stage mapping from Apple Health to our format
      const sleepStageName = {
        'INBED': 'In Bed',
        'ASLEEP': 'Sleep',
        'DEEP': 'Deep Sleep',
        'CORE': 'Core Sleep',
        'REM': 'REM Sleep',
        'AWAKE': 'Awake'
      }[item.value] || 'Sleep Session';

      // Check if this time range already exists
      if (existingTimeRanges.has(timeRangeKey)) {
        // Update existing session
        const index = existingTimeRanges.get(timeRangeKey);
        fitnessRecord.sleep.sessions[index].duration = duration;
        fitnessRecord.sleep.sessions[index].name = sleepStageName;
        fitnessRecord.sleep.sessions[index].description = `Sleep stage: ${item.value}`;
      } else {
        // Add new session
        fitnessRecord.sleep.sessions.push({
          startTime,
          endTime,
          duration,
          name: sleepStageName,
          description: `Sleep stage: ${item.value}`
        });
      }
    });

    // Recalculate total duration
    fitnessRecord.sleep.sessions.forEach(session => {
      fitnessRecord.sleep.totalSleepDuration += session.duration;
    });
  }

  /**
   * Process oxygen data and update fitness record
   * @param {Object} fitnessRecord - Fitness data record
   * @param {Array} oxygenData - Oxygen data
   */
  static processOxygenData(fitnessRecord, oxygenData) {
    // Initialize vitals object if it doesn't exist
    if (!fitnessRecord.vitals) {
      fitnessRecord.vitals = {
        bloodPressure: {
          systolic: 0,
          diastolic: 0
        },
        bodyTemperature: 0,
        oxygenSaturation: 0,
        respiratoryRate: 0
      };
    }

    // Create a combined array of all oxygen readings for proper sorting
    const allOxygenReadings = [...oxygenData];
    
    // Add existing oxygen reading if not null
    if (fitnessRecord.vitals.oxygenSaturation) {
      // We don't have the timestamp of the existing reading, so we'll just use the default value
      // This logic gives preference to newer readings in the incoming data
    }

    // Get the latest oxygen reading
    if (allOxygenReadings.length > 0) {
      // Sort by time (newest first)
      const sortedOxygenData = [...allOxygenReadings].sort((a, b) => {
        return new Date(b.startDate) - new Date(a.startDate);
      });

      // Set the most recent value (Apple Health provides oxygen as a decimal 0-1)
      // Multiply by 100 to get percentage format
      fitnessRecord.vitals.oxygenSaturation = sortedOxygenData[0].value * 100;
    }
  }

  /**
   * Sync Apple Health data for a specific user
   * @param {String} userId - User ID
   * @param {Array} hr - Heart rate data
   * @param {Array} steps - Steps data
   * @param {Array} sleep - Sleep data
   * @param {Array} oxygen - Oxygen saturation data
   * @returns {Object} Sync result
   */
  static async syncAppleHealthData(userId, hr, steps, sleep, oxygen) {
    try {
      console.log('Starting Apple Health sync with data:', {
        hrDataLength: hr?.length || 0,
        stepsDataLength: steps?.length || 0,
        sleepDataLength: sleep?.length || 0,
        oxygenDataLength: oxygen?.length || 0
      });

      // Group data by date (using local date)
      const groupedData = this.groupDataByDate(hr, steps, sleep, oxygen);
      console.log("grp data", groupedData);
      const results = [];

      // Process each date's data
      for (const [dateStr, data] of Object.entries(groupedData)) {
        const date = new Date(dateStr);
        console.log(`Processing data for date: ${dateStr}`, data);

        // Find existing record or create new one
        let fitnessRecord = await FitnessData.findOne({
          userId,
          date: {
            $gte: moment(date).startOf('day').toDate(),
            $lte: moment(date).endOf('day').toDate()
          }
        });

        if (!fitnessRecord) {
          console.log(`Creating new fitness record for date: ${dateStr}`);
          fitnessRecord = new FitnessData({
            userId,
            date,
            syncSource: 'APPLE_HEALTH',
            metadata: {
              syncStatus: 'SUCCESS',
              syncDetails: {
                dataTypes: [],
                processedAt: new Date(),
                rawResponseSize: 0
              }
            }
          });
        } else {
          console.log(`Updating existing fitness record for date: ${dateStr}`);
        }

        // Process heart rate data
        if (data.hr && data.hr.length > 0) {
          console.log(`Processing ${data.hr.length} heart rate readings`);
          this.processHeartRateData(fitnessRecord, data.hr);

          if (!fitnessRecord.metadata.syncDetails.dataTypes.includes('HEART_RATE')) {
            fitnessRecord.metadata.syncDetails.dataTypes.push('HEART_RATE');
          }
        }

        // Process steps data
        if (data.steps && data.steps.length > 0) {
          console.log(`Processing ${data.steps.length} steps entries`);
          console.log("steps...",data.steps);
          this.processStepsData(fitnessRecord, data.steps);

          if (!fitnessRecord.metadata.syncDetails.dataTypes.includes('STEPS')) {
            fitnessRecord.metadata.syncDetails.dataTypes.push('STEPS');
          }
        }

        // Process sleep data
        if (data.sleep && data.sleep.length > 0) {
          console.log(`Processing ${data.sleep.length} sleep sessions`);
          this.processSleepData(fitnessRecord, data.sleep);

          if (!fitnessRecord.metadata.syncDetails.dataTypes.includes('SLEEP')) {
            fitnessRecord.metadata.syncDetails.dataTypes.push('SLEEP');
          }
        }

        // Process oxygen data
        if (data.oxygen && data.oxygen.length > 0) {
          console.log(`Processing ${data.oxygen.length} oxygen readings`);
          this.processOxygenData(fitnessRecord, data.oxygen);

          if (!fitnessRecord.metadata.syncDetails.dataTypes.includes('OXYGEN')) {
            fitnessRecord.metadata.syncDetails.dataTypes.push('OXYGEN');
          }
        }

        // Initialize empty collections for other data types if they don't exist
        if (!fitnessRecord.water) {
          fitnessRecord.water = {
            entries: [],
            totalIntake: 0,
            targetIntake: 2000
          };
        }

        if (!fitnessRecord.respiratory) {
          fitnessRecord.respiratory = {
            readings: [],
            averageRate: 0,
            maxRate: 0,
            minRate: 0,
            restingRate: 0
          };
        }

        // Update sync metadata
        fitnessRecord.metadata.lastSyncTime = new Date();
        fitnessRecord.metadata.syncDetails.processedAt = new Date();
        fitnessRecord.metadata.syncDetails.rawResponseSize = JSON.stringify(data).length;

        // Save the record
        console.log(`Saving fitness record for date: ${dateStr}`);
        await fitnessRecord.save();
        results.push(fitnessRecord);
      }

      return {
        success: true,
        data: results,
        message: `Synced data for ${results.length} days`
      };
    } catch (error) {
      console.error('Apple Health sync error:', error);
      throw new Error(`Failed to sync Apple Health data: ${error.message}`);
    }
  }
}

module.exports = AppleHealthSyncService;