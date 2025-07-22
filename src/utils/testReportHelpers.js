// helpers/BloodTestHelper.js

const REFERENCE_RANGES = {
    'Glucose': { min: 70, max: 100, unit: 'mg/dL' },
    'Cholesterol': { min: 125, max: 200, unit: 'mg/dL' },
    'HDL': { min: 40, max: 60, unit: 'mg/dL' },
    'LDL': { min: 0, max: 100, unit: 'mg/dL' }
 };
 
 class BloodTestHelper {
    static standardizeStatus(status) {
        status = status.toLowerCase();
        if (status.includes('high') || status.includes('elevated')) return 'High';
        if (status.includes('low') || status.includes('deficient')) return 'Low';
        return 'Normal';
    }
 
    static calculateStatus(value, min, max) {
        if (value > max) return 'High';
        if (value < min) return 'Low';
        return 'Normal';
    }
 
    static standardizeReferenceValue(metricName, providedReference) {
        const standardRange = REFERENCE_RANGES[metricName];
        
        if (providedReference?.min != null && providedReference?.max != null) {
            return {
                min: parseFloat(providedReference.min),
                max: parseFloat(providedReference.max)
            };
        }
        
        return standardRange || { min: 0, max: 100 };
    }
 
    static isValidResponseStructure(response) {
        return (
            response &&
            typeof response.isValidReport === 'boolean' &&
            typeof response.title === 'string' &&
            typeof response.summary === 'string' &&
            Array.isArray(response.metrics) &&
            Array.isArray(response.charts)
        );
    }
 
    static attemptToFixJSON(jsonString) {
        const metricsMatch = jsonString.match(/"metrics"\s*:\s*\[([\s\S]*)\]/);
        if (metricsMatch) {
            const metricsContent = metricsMatch[1];
            const lastCompleteObject = metricsContent.match(/.*},/g);
            if (lastCompleteObject) {
                const fixedMetrics = lastCompleteObject.join('') + '}]';
                const fixedJSON = jsonString.replace(/"metrics"\s*:\s*\[([\s\S]*)\]/, `"metrics": ${fixedMetrics}`);
                try {
                    return JSON.parse(fixedJSON);
                } catch (e) {
                    console.error('Failed to fix JSON:', e);
                }
            }
        }
        return null;
    }
 
    // Add getter for reference ranges
    static getReferenceRanges() {
        return REFERENCE_RANGES;
    }
 
    // Add method to check if metric exists in reference ranges
    static hasReferenceRange(metricName) {
        return !!REFERENCE_RANGES[metricName];
    }
 
    // Add method to get specific reference range
    static getMetricReferenceRange(metricName) {
        return REFERENCE_RANGES[metricName] || null;
    }
 }
 
 module.exports = BloodTestHelper;