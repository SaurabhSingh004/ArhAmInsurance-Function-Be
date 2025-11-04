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
    async sendQuery(userId, chatId, query, timeout = 95000) {
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

    async getDocumentTypeAndCount(userId, chatId, claimType) {
        const query = `
Analyze the uploaded document and return ONLY valid JSON (no prose) matching this schema:

{
  "documentType": "one of: medical_report | police_report | bill | receipt | photo | other",
  "confidence": "high | medium | low",
  "detectedFrom": "string describing what indicated this type"
}

Rules:
- Identify the document type based on content, headers, format, and context
- medical_report: Hospital records, prescriptions, lab reports, medical certificates
- police_report: FIR, police complaint, accident report, theft report
- bill: Invoices, repair bills, hospital bills, service charges
- receipt: Payment receipts, transaction confirmations
- photo: Images of damage, accident scene, medical condition
- other: Any document not fitting above categories
- Output JSON only, no additional text
`;

        try {
            const response = await this.sendQuery(userId, chatId, query);

            // Parse JSON response
            let detectedType;
            try {
                let raw = (response?.answer ?? '').trim();

                // Strip code fences if any
                if (raw.startsWith('```json')) {
                    raw = raw.replace(/```json\s*/i, '').replace(/```\s*$/i, '');
                } else if (raw.startsWith('```')) {
                    raw = raw.replace(/```\s*/i, '').replace(/```\s*$/i, '');
                }

                // Try direct parse first
                try {
                    detectedType = JSON.parse(raw);
                } catch {
                    // Fallback: extract first JSON object
                    const start = raw.indexOf('{');
                    const end = raw.lastIndexOf('}');
                    if (start !== -1 && end !== -1 && end > start) {
                        const slice = raw.slice(start, end + 1);
                        detectedType = JSON.parse(slice);
                    } else {
                        throw new Error('No JSON object found');
                    }
                }
            } catch (parseError) {
                console.error('Error parsing document type JSON:', parseError, response?.answer);
                throw new Error('Failed to parse document type from AI response');
            }

            // Get required documents for the claim type
            const requiredDocs = this.getRequiredDocuments(claimType);

            // Count how many of this document type are required
            const documentType = detectedType.documentType || 'other';
            const requiredCount = requiredDocs.filter(doc => doc === documentType).length;

            // Check if this document type is required for this claim
            const isRequired = requiredDocs.includes(documentType);

            return {
                documentType,
                confidence: detectedType.confidence || 'medium',
                detectedFrom: detectedType.detectedFrom || 'Document analysis',
                claimType,
                requiredDocuments: requiredDocs,
                isRequired,
                requiredCount, // How many of this type are needed
                fullResponse: response
            };

        } catch (error) {
            throw logError('getDocumentTypeAndCount', error, { userId, chatId, claimType });
        }
    }

    // Helper function to get required documents (add this to your service)
    getRequiredDocuments(claimType) {
        const requiredDocs = {
            vehicle: ['police_report', 'photo', 'bill'],
            two_wheeler: ['police_report', 'photo', 'bill'],
            car: ['police_report', 'photo', 'bill'],
            health: ['medical_report', 'bill', 'receipt'],
            travel: ['medical_report', 'bill', 'receipt'],
            flight: ['receipt', 'other'],
            life: ['medical_report', 'other'],
            home: ['police_report', 'photo', 'bill'],
            personal_accident: ['medical_report', 'police_report', 'bill'],
            marine: ['other', 'photo', 'bill'],
            fire: ['police_report', 'photo', 'bill'],
            other: ['other']
        };

        return requiredDocs[claimType] || [];
    }

    async getStructuredInsuranceData(userId, chatId) {
        const query = `
Return ONLY valid JSON (no prose) matching this schema. Detect the document type first, then extract fields. 
If a field is missing/unreadable, set null. Use ISO 8601 dates (YYYY-MM-DD). 
DO NOT fabricate data. Read from the uploaded document only.

{
  "json_schema_version": "1.0",
  "documentType": "one of: insurance_policy, insurance_claim, invoice, receipt, id_proof, medical_report, ticket_travel, other",
  "insuranceCategory": "vehicle | two_wheeler | car | health | travel | flight | life | home | personal_accident | marine | fire | other | null",
  "normalized": {
    "policyId": "string|null",
    "policyNumber": "string|null",
    "status": "active|expired|cancelled|unknown|null",
    "productName": "string|null",
    "coveragePeriod": {
      "startDate": "YYYY-MM-DD|null",
      "endDate": "YYYY-MM-DD|null"
    },
    "beneficiary": {
      "name": "string|null",
      "email": "string|null",
      "birthDate": "YYYY-MM-DD|null",
      "documentNumber": "string|null",
      "residenceCountry": "string|null"
    },
    "duration": "number|null",
    "coverage": "string|null",
    "cancelDate": "YYYY-MM-DD|null",
    "premium": "number|null",
    "currency": "string|null",
    "insurer": "string|null",
    "createdAt": "YYYY-MM-DD|null"
  },
  "extractedData": {
    "_freeForm": "Include ALL parsed fields from the document relevant to its type as key-value pairs. This section may contain additional fields beyond 'normalized'."
  }
}

Rules:
- Calculate "normalized.duration" in days when both coveragePeriod.startDate and endDate exist, else null.
- "documentType" MUST reflect the actual file (e.g., insurance_policy, invoice, etc.).
- If documentType != "insurance_policy", you MUST still fill "extractedData" and may leave "normalized" fields as null.
- Output JSON only.
`;

        try {
            const response = await this.sendQuery(userId, chatId, query);

            // --- Robust JSON extraction (handles fenced code blocks or extra text defensively) ---
            let payload;
            try {
                let raw = (response?.answer ?? '').trim();

                // Strip code fences if any
                if (raw.startsWith('```json')) raw = raw.replace(/```json\s*/i, '').replace(/```\s*$/i, '');
                else if (raw.startsWith('```')) raw = raw.replace(/```\s*/i, '').replace(/```\s*$/i, '');

                // Try direct parse first
                try {
                    payload = JSON.parse(raw);
                } catch {
                    // Fallback: extract first JSON object with a rudimentary brace matcher
                    const start = raw.indexOf('{');
                    const end = raw.lastIndexOf('}');
                    if (start !== -1 && end !== -1 && end > start) {
                        const slice = raw.slice(start, end + 1);
                        payload = JSON.parse(slice);
                    } else {
                        throw new Error('No JSON object found');
                    }
                }
            } catch (parseError) {
                console.error('Error parsing structured document JSON:', parseError, response?.answer);
                throw new Error('Failed to parse structured document from AI response');
            }

            // --- Normalize some expectations/safety ---
            const normalized = payload?.normalized ?? {};
            const coveragePeriod = normalized?.coveragePeriod ?? {};
            // If duration came as string like "365 days", coerce to number
            if (typeof normalized.duration === 'string') {
                const m = normalized.duration.match(/(\d+)/);
                normalized.duration = m ? parseInt(m[1], 10) : null;
            }

            // Build a single payload you can persist using the generic Document schema
            const documentPayload = {
                userId,
                chatId,
                documentType: payload.documentType ?? 'other',
                insuranceCategory: payload.insuranceCategory ?? null,

                // Storage/source fields to be added by your pipeline (docUrl, azureBlobName) later if needed
                // docUrl,
                // azureBlobName,

                processingStatus: 'completed',
                extractorVersion: 'v1',
                extractedAt: new Date(),
                extractedData: payload.extractedData ?? {},

                // Normalized insurance policy fields (safe even if non-insurance because they can be null)
                policyId: normalized.policyId ?? null,
                policyNumber: normalized.policyNumber ?? null,
                status: normalized.status ?? 'unknown',
                productName: normalized.productName ?? null,
                coveragePeriod: {
                    startDate: coveragePeriod.startDate ? new Date(coveragePeriod.startDate) : undefined,
                    endDate: coveragePeriod.endDate ? new Date(coveragePeriod.endDate) : undefined
                },
                beneficiary: {
                    name: normalized?.beneficiary?.name ?? null,
                    email: normalized?.beneficiary?.email ?? null,
                    birthDate: normalized?.beneficiary?.birthDate ? new Date(normalized.beneficiary.birthDate) : undefined,
                    documentNumber: normalized?.beneficiary?.documentNumber ?? null,
                    residenceCountry: normalized?.beneficiary?.residenceCountry ?? null
                },
                duration: typeof normalized.duration === 'number' ? normalized.duration : null,
                coverage: normalized.coverage ?? null,
                cancelDate: normalized.cancelDate ? new Date(normalized.cancelDate) : undefined,
                premium: typeof normalized.premium === 'number' ? normalized.premium : null,
                currency: normalized.currency ?? 'INR',
                insurer: normalized.insurer ?? 'Arham Insurance Brokers Private Limited',
                // createdAt (doc issue date) from normalized.createdAt if present; your model also has timestamps
                // You can store it inside extractedData as well if you prefer not to override Mongoose timestamps
            };

            return {
                insuranceData: documentPayload,
                fullResponse: response
            };
        } catch (error) {
            throw logError('getStructuredInsuranceData1', error, { userId, chatId });
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