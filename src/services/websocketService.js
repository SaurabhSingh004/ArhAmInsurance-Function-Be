// services/WebSocketService.js
const WebSocket = require('ws');
const EventEmitter = require('events');
const { logError } = require('../utils/logError');

class GlobalWebSocketManager extends EventEmitter {
    constructor() {
        super();
        this.wsUrl = 'wss://doc-insights.happyriver-1999a58f.southindia.azurecontainerapps.io/ws/query';
        this.globalConnection = null;
        this.connectionState = 'disconnected'; // disconnected, connecting, connected
        this.pendingQueries = new Map(); // queryId -> {resolve, reject, timeout}
        this.queryCounter = 0;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
        this.heartbeatInterval = null;
        this.isShuttingDown = false;
    }

    /**
     * Initialize global WebSocket connection
     */
    async initialize() {
        if (this.connectionState === 'connected' && 
            this.globalConnection && 
            this.globalConnection.readyState === WebSocket.OPEN) {
            return this.globalConnection;
        }

        if (this.connectionState === 'connecting') {
            return new Promise((resolve, reject) => {
                this.once('connected', resolve);
                this.once('connection-failed', reject);
            });
        }

        return this.connect();
    }

    /**
     * Connect to WebSocket server
     */
    async connect() {
        return new Promise((resolve, reject) => {
            if (this.isShuttingDown) {
                reject(new Error('Service is shutting down'));
                return;
            }

            this.connectionState = 'connecting';
            console.log('Establishing global WebSocket connection...');

            try {
                this.globalConnection = new WebSocket(this.wsUrl);

                const connectionTimeout = setTimeout(() => {
                    this.connectionState = 'disconnected';
                    this.globalConnection = null;
                    const error = new Error('WebSocket connection timeout');
                    this.emit('connection-failed', error);
                    reject(error);
                }, 10000);

                this.globalConnection.on('open', () => {
                    clearTimeout(connectionTimeout);
                    this.connectionState = 'connected';
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = 1000;
                    
                    console.log('Global WebSocket connection established');
                    this.setupHeartbeat();
                    this.emit('connected', this.globalConnection);
                    resolve(this.globalConnection);
                });

                this.globalConnection.on('message', (data) => {
                    this.handleMessage(data);
                });

                this.globalConnection.on('error', (error) => {
                    clearTimeout(connectionTimeout);
                    console.error('Global WebSocket error:', error);
                    
                    if (this.connectionState === 'connecting') {
                        this.connectionState = 'disconnected';
                        this.emit('connection-failed', error);
                        reject(error);
                    } else {
                        this.handleConnectionLoss(error);
                    }
                });

                this.globalConnection.on('close', (code, reason) => {
                    clearTimeout(connectionTimeout);
                    console.log(`Global WebSocket closed: ${code} - ${reason}`);
                    this.connectionState = 'disconnected';
                    this.clearHeartbeat();
                    
                    if (!this.isShuttingDown) {
                        this.handleConnectionLoss(new Error(`Connection closed: ${code} - ${reason}`));
                    }
                });

                this.globalConnection.on('pong', () => {
                    console.log('Global WebSocket heartbeat received');
                });

            } catch (error) {
                this.connectionState = 'disconnected';
                this.emit('connection-failed', error);
                reject(error);
            }
        });
    }

    /**
     * Handle incoming messages
     */
    handleMessage(data) {
        try {
            const response = JSON.parse(data.toString());
            console.log('Global WebSocket received:', JSON.stringify(response, null, 2));

            // Find matching query by user_id, chat_id, or custom query_id
            let matchingQueryId = null;

            // First try to find by custom query_id
            if (response.query_id) {
                matchingQueryId = response.query_id;
            } else {
                // Fallback: find by user_id and chat_id combination
                for (const [queryId, queryInfo] of this.pendingQueries) {
                    if (queryInfo.userId === response.user_id && 
                        queryInfo.chatId === response.chat_id) {
                        matchingQueryId = queryId;
                        break;
                    }
                }
            }

            if (matchingQueryId && this.pendingQueries.has(matchingQueryId)) {
                const queryInfo = this.pendingQueries.get(matchingQueryId);
                clearTimeout(queryInfo.timeout);
                this.pendingQueries.delete(matchingQueryId);
                queryInfo.resolve(response);
            } else {
                console.warn('No matching query found for response:', response);
            }

        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    /**
     * Send query using shared connection
     */
    async sendQuery(userId, chatId, query, timeout = 75000) {
        // Ensure connection is established
        await this.initialize();

        const queryId = `query_${++this.queryCounter}_${Date.now()}`;
        
        return new Promise((resolve, reject) => {
            // Set timeout for query
            const timeoutId = setTimeout(() => {
                if (this.pendingQueries.has(queryId)) {
                    this.pendingQueries.delete(queryId);
                    reject(new Error(`Query timeout after ${timeout}ms`));
                }
            }, timeout);

            // Store query info
            this.pendingQueries.set(queryId, {
                userId,
                chatId,
                query,
                resolve,
                reject,
                timeout: timeoutId,
                timestamp: Date.now()
            });

            // Send message
            const message = {
                user_id: userId,
                chat_id: chatId,
                query: query,
                query_id: queryId
            };

            try {
                if (this.globalConnection && this.globalConnection.readyState === WebSocket.OPEN) {
                    this.globalConnection.send(JSON.stringify(message));
                    console.log(`Query sent via global connection:`, JSON.stringify(message));
                } else {
                    // Connection lost, clean up and reject
                    clearTimeout(timeoutId);
                    this.pendingQueries.delete(queryId);
                    reject(new Error('WebSocket connection not available'));
                }
            } catch (error) {
                clearTimeout(timeoutId);
                this.pendingQueries.delete(queryId);
                reject(error);
            }
        });
    }

    /**
     * Handle connection loss and reconnection
     */
    async handleConnectionLoss(error) {
        if (this.isShuttingDown) return;

        console.error('Global WebSocket connection lost:', error.message);
        this.globalConnection = null;
        this.clearHeartbeat();

        // Reject all pending queries
        for (const [queryId, queryInfo] of this.pendingQueries) {
            clearTimeout(queryInfo.timeout);
            queryInfo.reject(new Error('Connection lost'));
        }
        this.pendingQueries.clear();

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(async () => {
                try {
                    await this.connect();
                    console.log('Global WebSocket reconnected successfully');
                } catch (reconnectError) {
                    console.error('Reconnection failed:', reconnectError.message);
                }
            }, delay);
        } else {
            console.error('Max reconnection attempts reached. Manual intervention required.');
            this.emit('max-reconnects-reached');
        }
    }

    /**
     * Setup heartbeat to keep connection alive
     */
    setupHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.globalConnection && this.globalConnection.readyState === WebSocket.OPEN) {
                this.globalConnection.ping();
            }
        }, 45000); // 45 seconds
    }

    /**
     * Clear heartbeat interval
     */
    clearHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Get connection status and statistics
     */
    getStatus() {
        return {
            connectionState: this.connectionState,
            isConnected: this.connectionState === 'connected' && 
                         this.globalConnection && 
                         this.globalConnection.readyState === WebSocket.OPEN,
            pendingQueries: this.pendingQueries.size,
            reconnectAttempts: this.reconnectAttempts,
            uptime: this.connectionState === 'connected' ? Date.now() - this.connectedAt : 0
        };
    }

    /**
     * Force reconnection
     */
    async forceReconnect() {
        console.log('Forcing WebSocket reconnection...');
        
        if (this.globalConnection) {
            this.globalConnection.close(1000, 'Manual reconnect');
        }
        
        this.connectionState = 'disconnected';
        this.reconnectAttempts = 0;
        
        return this.initialize();
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('Shutting down global WebSocket connection...');
        this.isShuttingDown = true;
        
        // Reject all pending queries
        for (const [queryId, queryInfo] of this.pendingQueries) {
            clearTimeout(queryInfo.timeout);
            queryInfo.reject(new Error('Service shutting down'));
        }
        this.pendingQueries.clear();
        
        // Close connection
        if (this.globalConnection && this.globalConnection.readyState === WebSocket.OPEN) {
            this.globalConnection.close(1000, 'Service shutdown');
        }
        
        this.clearHeartbeat();
        this.connectionState = 'disconnected';
        this.globalConnection = null;
    }

    // Backward compatibility methods
    async checkInsuranceActive(userId, chatId) {
        const query = "Is this insurance policy currently active as of " + new Date().toISOString().split('T')[0] + "? IMPORTANT: A policy is ONLY active if: 1. Current date falls between coverage start and end dates 2. Status is not cancelled 3. No cancellation date exists Coverage period: Check if today's date (" + new Date().toISOString().split('T')[0] + ") is between the policy start and end dates. Answer with Yes or No only. If No, briefly state the reason in one line.";

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

    async getStructuredInsuranceData(userId, chatId) {
        const query = `Extract the ACTUAL insurance policy data from the uploaded document and format it as JSON. DO NOT generate sample data - read the real information from the document. Extract these exact fields from the document: {"policyId": "extract actual policy ID from document", "policyNumber": "extract actual policy number from document", "status": "extract actual status from document (active/expired/cancelled)", "productName": "extract actual product name from document", "coveragePeriod": {"startDate": "extract actual start date from document (YYYY-MM-DD)", "endDate": "extract actual end date from document (YYYY-MM-DD)"}, "beneficiary": {"name": "extract actual beneficiary name from document", "email": "extract actual email from document", "birthDate": "extract actual birth date from document (YYYY-MM-DD)", "documentNumber": "extract actual document number from document", "residenceCountry": "extract actual country from document"}, "duration": "calculate actual duration in days between start and end dates", "coverage": "extract actual coverage details from document", "docUrl": "will be provided separately", "createdAt": "extract actual creation/issue date from document (YYYY-MM-DD)"} IMPORTANT: Read the actual text from the uploaded insurance document. Do not make up or generate fake data.`;
        try {
            const response = await this.sendQuery(userId, chatId, query);
            
            let insuranceData;
            try {
                let jsonString = response.answer.trim();
                
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

    closeConnection(userId, chatId) {
        // In global connection mode, we don't close the connection
        // Just log that this was called for compatibility
        console.log(`closeConnection called for ${userId}-${chatId} (using global connection)`);
    }

    closeAllConnections() {
        return this.shutdown();
    }
}

// Create singleton instance
const globalWebSocketManager = new GlobalWebSocketManager();

// Auto-initialize on first require
globalWebSocketManager.initialize().catch(error => {
    console.error('Failed to initialize global WebSocket connection:', error);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await globalWebSocketManager.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await globalWebSocketManager.shutdown();
    process.exit(0);
});

// Export singleton
module.exports = globalWebSocketManager;