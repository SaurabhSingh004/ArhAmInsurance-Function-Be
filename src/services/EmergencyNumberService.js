const axios = require('axios');

class EmergencyNumberService {
    
    static async getEmergencyNumbers(countryCode) {
        try {
            // Validate and normalize country code
            const normalizedCode = this.validateCountryCode(countryCode);
            
            // Try to get emergency numbers from API
            const response = await axios.get(`https://emergencynumberapi.com/api/country/${normalizedCode}`, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'EmergencyContactApp/1.0'
                }
            });

            if (response.data && response.data.data) {
                console.log("api response to get emergency number", JSON.stringify(response.data.data, null, 2));
                return this.formatEmergencyNumbers(response.data.data, normalizedCode);
            } else {
                // Fallback to Mauritius
                return await this.getMauritiusNumbers();
            }

        } catch (error) {
            console.error('Error fetching emergency numbers:', error.message);
            // Fallback to Mauritius on any error
            return await this.getMauritiusNumbers();
        }
    }

    static validateCountryCode(countryCode) {
        // If no country code provided, default to Mauritius
        if (!countryCode) {
            return 'MU';
        }

        // Normalize to uppercase and validate format
        const normalized = countryCode.toString().trim().toUpperCase();
        
        // Check if it's a valid 2-letter code format
        if (!/^[A-Z]{2}$/.test(normalized)) {
            return 'MU'; // Default to Mauritius for invalid format
        }

        return normalized;
    }

    static async getMauritiusNumbers() {
        try {
            const response = await axios.get('https://emergencynumberapi.com/api/country/MU', {
                timeout: 5000
            });

            if (response.data && response.data.data) {
                console.log("Mauritius API response:", JSON.stringify(response.data.data, null, 2));
                return this.formatEmergencyNumbers(response.data.data, 'MU');
            } else {
                // Hardcoded fallback for Mauritius
                return this.getMauritiusFallback();
            }
        } catch (error) {
            console.error('Error fetching Mauritius numbers:', error.message);
            return this.getMauritiusFallback();
        }
    }

    static getMauritiusFallback() {
        return {
            country: 'Mauritius',
            countryCode: 'MU',
            police: '999',
            ambulance: '114',
            fire: '995',
            dispatch: null,
            source: 'fallback'
        };
    }

    static formatEmergencyNumbers(apiData, countryCode) {
        const country = apiData.country || {};
        
        // Extract numbers with fallback logic
        let policeNumber = this.extractNumbers(apiData.police);
        let ambulanceNumber = this.extractNumbers(apiData.ambulance);
        let fireNumber = this.extractNumbers(apiData.fire);
        let dispatchNumber = this.extractNumbers(apiData.dispatch);
        
        // If no police number found but dispatch exists, use dispatch
        if (!policeNumber && dispatchNumber) {
            policeNumber = dispatchNumber;
        }
        
        // Special handling for Mauritius if API doesn't return proper data
        if (countryCode === 'MU' && (!policeNumber || !ambulanceNumber || !fireNumber)) {
            return {
                country: country.name || 'Mauritius',
                countryCode: 'MU',
                police: policeNumber || '999',
                ambulance: ambulanceNumber || '114',
                fire: fireNumber || '995',
                dispatch: dispatchNumber,
                member112: apiData.member_112 || true,
                localOnly: apiData.localOnly || false,
                source: 'api-enhanced'
            };
        }
        
        return {
            country: country.name || 'Unknown',
            countryCode: country.ISOCode || countryCode,
            police: policeNumber,
            ambulance: ambulanceNumber,
            fire: fireNumber,
            dispatch: dispatchNumber,
            member112: apiData.member_112 || false,
            localOnly: apiData.localOnly || false,
            source: 'api'
        };
    }

    static extractNumbers(serviceObject) {
        if (!serviceObject) return null;

        // Try to get the most accessible number first
        if (serviceObject.all && serviceObject.all.length > 0) {
            return serviceObject.all[0]; // Return first number as string
        }

        if (serviceObject.gsm && serviceObject.gsm.length > 0) {
            return serviceObject.gsm[0];
        }

        if (serviceObject.fixed && serviceObject.fixed.length > 0) {
            return serviceObject.fixed[0];
        }

        return null;
    }

    // Optional: Method to get all emergency numbers for caching
    static async getAllEmergencyNumbers() {
        try {
            const response = await axios.get('https://emergencynumberapi.com/api/data/all', {
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching all emergency numbers:', error.message);
            throw error;
        }
    }
}

module.exports = EmergencyNumberService;