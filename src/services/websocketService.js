// services/WebSocketService.js
const WebSocket = require('ws');
const { logError } = require('../utils/logError');

class WebSocketService {
    constructor() {
        this.wsUrl = 'wss://doc-insights.happyriver-1999a58f.southindia.azurecontainerapps.io/ws/query';
        this.connections = new Map(); // Store active connections
        this.responseQueue = new Map(); // Store responses waiting for processing
    }

    /**
     * Connect to WebSocket and send query
     * @param {string} userId - User ID
     * @param {string} chatId - Chat ID
     * @param {string} query - Query to send
     * @param {number} timeout - Timeout in milliseconds (default 30 seconds)
     * @returns {Promise<Object>} Response from WebSocket
     */
    async sendQuery(userId, chatId, query, timeout = 60000) {
        return new Promise((resolve, reject) => {
            let ws;
            let timeoutId;
            let isResolved = false;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
                this.connections.delete(`${userId}-${chatId}`);
                this.responseQueue.delete(`${userId}-${chatId}`);
            };

            const resolveOnce = (data) => {
                if (!isResolved) {
                    isResolved = true;
                    cleanup();
                    resolve(data);
                }
            };

            const rejectOnce = (error) => {
                if (!isResolved) {
                    isResolved = true;
                    cleanup();
                    reject(error);
                }
            };

            try {
                ws = new WebSocket(this.wsUrl);
                this.connections.set(`${userId}-${chatId}`, ws);

                // Set timeout
                timeoutId = setTimeout(() => {
                    rejectOnce(new Error('WebSocket query timeout'));
                }, timeout);

                ws.on('open', () => {
                    console.log('WebSocket connected');
                    
                    const message = {
                        user_id: userId,
                        chat_id: chatId,
                        query: query
                    };

                    ws.send(JSON.stringify(message));
                    console.log('Query sent:', message);
                });

                ws.on('message', (data) => {
                    try {
                        const response = JSON.parse(data.toString());
                        console.log('Received response:', response);

                        // Validate response structure
                        if (response.user_id === userId && 
                            response.chat_id === chatId && 
                            response.answer) {
                            resolveOnce(response);
                        } else {
                            console.log('Invalid response format or mismatched IDs');
                        }
                    } catch (parseError) {
                        console.error('Error parsing WebSocket response:', parseError);
                        rejectOnce(new Error('Invalid response format'));
                    }
                });

                ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    rejectOnce(new Error(`WebSocket error: ${error.message}`));
                });

                ws.on('close', (code, reason) => {
                    console.log(`WebSocket closed: ${code} - ${reason}`);
                    if (!isResolved) {
                        rejectOnce(new Error('WebSocket connection closed unexpectedly'));
                    }
                });

            } catch (error) {
                console.error('Error creating WebSocket connection:', error);
                rejectOnce(error);
            }
        });
    }

    /**
     * Check if insurance policy is active
     * @param {string} userId - User ID
     * @param {string} chatId - Chat ID
     * @returns {Promise<Object>} Response with active status
     */
    async checkInsuranceActive(userId, chatId) {
        const query = "Is this insurance policy currently active? Consider the following conditions: - The policy status must be 'Active'. - The current date must fall between the coverage start date (inclusive) and coverage end date (inclusive). - The policy must not be cancelled (i.e., no cancellation date present, or cancellation date is in the future). Answer with Yes or No only. If No, briefly state the reason in one line.";

        try {
            const response = await this.sendQuery(userId, chatId, query);
            
            const answer = response.answer.toLowerCase();
            const isActive = answer.includes('yes') || answer.startsWith('yes');
            
            return {
                isActive,
                response: response.answer,
                fullResponse: response
            };
        } catch (error) {
            throw logError('checkInsuranceActive', error, { userId, chatId });
        }
    }

    /**
     * Get structured insurance data
     * @param {string} userId - User ID
     * @param {string} chatId - Chat ID
     * @returns {Promise<Object>} Structured insurance data
     */
    async getStructuredInsuranceData(userId, chatId) {
        const query = `Generate a realistic insurance policy document in the following JSON format. Include plausible values for all fields, ensuring consistency between coverage period and policy status. The status should be either "active", "expired", or "cancelled" based on dates and cancellation info. Output should be a valid JSON object:

{
  "policyId": "string",
  "policyNumber": "string",
  "status": "active | expired | cancelled",
  "productName": "string",
  "coveragePeriod": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"
  },
  "beneficiary": {
    "name": "string",
    "email": "string",
    "birthDate": "YYYY-MM-DD",
    "documentNumber": "string",
    "residenceCountry": "string"
  },
  "duration": "number of days",
  "coverage": "string",
  "docUrl": "string (a URL)",
  "createdAt": "YYYY-MM-DD",
  "cancelDate": "optional - YYYY-MM-DD"
}`;

        try {
            const response = await this.sendQuery(userId, chatId, query);
            
            // Parse the JSON from the answer
            let insuranceData;
            try {
                // Clean the response to extract JSON
                let jsonString = response.answer.trim();
                
                // Remove markdown code blocks if present
                if (jsonString.startsWith('```json')) {
                    jsonString = jsonString.replace(/```json\s*/, '').replace(/```\s*$/, '');
                } else if (jsonString.startsWith('```')) {
                    jsonString = jsonString.replace(/```\s*/, '').replace(/```\s*$/, '');
                }
                
                insuranceData = JSON.parse(jsonString);
            } catch (parseError) {
                console.error('Error parsing insurance data JSON:', parseError);
                throw new Error('Failed to parse insurance data from AI response');
            }
            
            // Calculate duration if it's a string
            if (typeof insuranceData.duration === 'string') {
                const match = insuranceData.duration.match(/(\d+)/);
                insuranceData.duration = match ? parseInt(match[1]) : 0;
            }
            
            return {
                insuranceData,
                fullResponse: response
            };
        } catch (error) {
            throw logError('getStructuredInsuranceData', error, { userId, chatId });
        }
    }

    /**
     * Close specific WebSocket connection
     * @param {string} userId - User ID
     * @param {string} chatId - Chat ID
     */
    closeConnection(userId, chatId) {
        const connectionKey = `${userId}-${chatId}`;
        const ws = this.connections.get(connectionKey);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
            this.connections.delete(connectionKey);
            this.responseQueue.delete(connectionKey);
        }
    }

    /**
     * Close all WebSocket connections
     */
    closeAllConnections() {
        for (const [key, ws] of this.connections) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        }
        this.connections.clear();
        this.responseQueue.clear();
    }
}

module.exports = new WebSocketService();