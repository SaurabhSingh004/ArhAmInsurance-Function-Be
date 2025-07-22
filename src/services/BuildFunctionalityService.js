const BuildFunctionality = require('../models/buildFunctionality');
const mongoose = require('mongoose');
const { logError } = require('../utils/logError');

class BuildFunctionalityService {

  /**
   * Add or update build functionality features
   */
  static async addBuildFunctionality(buildNumber, features) {
    try {
      if (!buildNumber) {
        throw new Error('Build number is required');
      }

      if (!features || typeof features !== 'object') {
        throw new Error('Features object is required');
      }

      // Format features into the array structure our schema expects
      const formattedFeatures = Object.entries(features).map(([name, enabled]) => ({
        name,
        enabled: Boolean(enabled),
        addedInVersion: buildNumber
      }));

      // Check if this build already exists
      let build = await BuildFunctionality.findOne({ buildNumber });

      if (build) {
        // Update existing build
        // First, create a map of existing features to preserve descriptions and metadata
        const existingFeatureMap = new Map();
        build.features.forEach(feature => {
          existingFeatureMap.set(feature.name, feature);
        });

        // Merge existing and new features
        const updatedFeatures = formattedFeatures.map(newFeature => {
          const existing = existingFeatureMap.get(newFeature.name);
          if (existing) {
            // Preserve description and metadata if they exist
            return {
              ...existing.toObject(),
              enabled: newFeature.enabled
            };
          }
          return newFeature;
        });

        // Add features that already exist but weren't in the update
        build.features.forEach(existingFeature => {
          if (!formattedFeatures.some(f => f.name === existingFeature.name)) {
            updatedFeatures.push(existingFeature);
          }
        });

        build.features = updatedFeatures;
        await build.save();

        return {
          isUpdate: true,
          data: build
        };
      } else {
        // Create new build
        build = new BuildFunctionality({
          buildNumber,
          features: formattedFeatures
        });

        await build.save();

        return {
          isUpdate: false,
          data: build
        };
      }
    } catch (error) {
      throw logError('addBuildFunctionality', error);
    }
  }

  /**
   * Get build functionality features by build number
   */
  static async getBuildFunctionality(buildNumber) {
    try {
      if (!buildNumber) {
        throw new Error('Build number is required');
      }

      const build = await BuildFunctionality.findOne({ buildNumber });

      if (!build) {
        throw new Error('Build not found');
      }

      // Format the response to match the desired structure
      const formattedFeatures = {};
      build.features.forEach(feature => {
        formattedFeatures[feature.name] = feature.enabled;
      });

      return formattedFeatures;
    } catch (error) {
      throw logError('getBuildFunctionality', error, { buildNumber });
    }
  }

  static async toggleFeature(buildId, featureName) {
    try {
      // Validate inputs
      if (!buildId || !featureName) {
        throw new Error('Build ID and Feature name are required');
      }

      // Make sure buildId is valid for MongoDB
      if (!mongoose.Types.ObjectId.isValid(buildId)) {
        throw new Error('Invalid build ID format');
      }

      const build = await BuildFunctionality.findById(buildId);

      if (!build) {
        throw new Error('Build not found');
      }

      // Ensure features array exists
      if (!Array.isArray(build.features)) {
        build.features = [];
      }

      // Find the feature in the array
      const featureIndex = build.features.findIndex(feature => feature.name === featureName);
      console.log('featureIndex', featureIndex);

      if (featureIndex === -1) {
        // Feature doesn't exist, add it with default values
        build.features.push({
          name: featureName,
          enabled: true, // Set to true since we're toggling from non-existent (false)
          addedInVersion: build.buildNumber
        });
        console.log('Added new feature:', featureName);
      } else {
        // Toggle the existing feature
        build.features[featureIndex].enabled = !build.features[featureIndex].enabled;
        console.log('Toggled feature:', featureName, 'to', build.features[featureIndex].enabled);
      }

      // Mark the features array as modified (important for Mixed types)
      build.markModified('features');

      // Save with explicit promise handling
      const result = await build.save();
      console.log('Build saved successfully', result._id);

      return result;
    } catch (error) {
      throw logError('toggleFeature', error, { buildId, featureName });
    }
  }

  static async deleteFeature(buildId, featureName) {
    try {
      // Validate inputs
      if (!buildId || !featureName) {
        throw new Error('Build ID and feature name are required');
      }

      // Make sure buildId is valid for MongoDB
      if (!mongoose.Types.ObjectId.isValid(buildId)) {
        throw new Error('Invalid build ID format');
      }

      const build = await BuildFunctionality.findById(buildId);

      if (!build) {
        throw new Error('Build not found');
      }

      // Ensure features array exists
      if (!Array.isArray(build.features)) {
        throw new Error('No features found for this build');
      }

      // Find the feature in the array
      const featureIndex = build.features.findIndex(feature => feature.name === featureName);

      // Check if feature exists
      if (featureIndex === -1) {
        throw new Error(`Feature "${featureName}" does not exist for this build`);
      }

      // Store feature name for response message
      const featureName_deleted = build.features[featureIndex].name;

      // Remove the feature using splice
      build.features.splice(featureIndex, 1);

      // Mark the features array as modified (important for Mixed types)
      build.markModified('features');

      // Save the changes
      await build.save();

      return {
        data: build,
        deletedFeature: featureName_deleted
      };
    } catch (error) {
      throw logError('deleteFeature', error, { buildId, featureName });
    }
  }

  static async getAllBuilds() {
    try {
      const build = await BuildFunctionality.find();

      if (!build) {
        throw new Error('Build not found');
      }

      // Format the response to match the desired structure
      const formattedBuilds = build.map(buildItem => ({
        buildId: buildItem._id,
        buildNumber: buildItem.buildNumber,
        features: buildItem.features.map(feature => ({
          name: feature.name,
          enabled: feature.enabled
        }))
      }));

      return formattedBuilds;
    } catch (error) {
      throw logError('getAllBuilds', error);
    }
  }

  /**
   * Check if a specific feature is enabled for a build
   */
  static async isFeatureEnabled(buildNumber, featureName) {
    try {
      if (!buildNumber || !featureName) {
        throw new Error('Both build number and feature name are required');
      }

      const build = await BuildFunctionality.findOne({ buildNumber });

      if (!build) {
        throw new Error('Build not found');
      }

      const isEnabled = build.isFeatureEnabled(featureName);

      return { isEnabled };
    } catch (error) {
      throw logError('isFeatureEnabled', error, { buildNumber, featureName });
    }
  }
}

module.exports = BuildFunctionalityService;