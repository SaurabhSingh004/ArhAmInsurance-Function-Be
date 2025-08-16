const wellnessRoutes = require('./wellnessRoutes');
const userRewardRoutes = require('./userRewardRoutes');
const userRoutes = require('./userRoutes');
const taskRoutes = require('./taskRoutes');
const supportTicketRoutes = require('./supportTicketRoutes');
const subscriptionRoutes = require('./subscriptionRoutes');
const subAccountRoutes = require('./subAccountRoutes');
const smartscaleRoutes = require('./smartscaleMetricRoutes');
const paymentRoutes = require('./paymentRoutes');
const medicineRoutes = require('./medicineRoutes');
const medicalConditionRoutes = require('./medicalConditionRoutes');
const mealRoutes = require('./mealRoutes');
const homePageRoutes = require('./homePageRoutes');
const contactRoutes = require('./contactAppRoutes');
const healthPageRoutes = require('./healthPageRoutes');
const appleHealthRoutes = require('./appleHealth');
const bloodTestRoutes = require('./bloodTestReport');
const bodyCompositionRoutes = require('./bodyComposition');
const coachRoutes = require('./coach');
const coachHistoryRoutes = require('./coachHistoryRoutes');
const couponRoutes = require('./coupon');
const cgmRoutes = require('./cgm');
const buildRoutes = require('./build');
const emergencyRoutes = require('./emergencyContacts');
const responseWrapper = require('../utils/responseWrapper');
const logger = require('../utils/logger');
const multipart = require('parse-multipart');
const deviceAuthRoutes = require('./deviceAuth');
const authRoutes = require('./auth');
const dietPageRoutes = require('./dietPlanPage');
const dietPlanRoutes = require('./dietPlans');
const faceScanVitalsRoutes = require('./faceScanVitalRoutes');
const diseasePredictionRoutes = require('./diseasePredictionRoutes');
const goalsRoutes = require('./goalsRoutes');
const fitnessRoutes = require('./fitnessRoutes');
const dailyChecklistRoutes = require('./dailyChecklists');
const adminRoutes =require('./adminRoutes');
const insuranceRoutes = require('./insuranceRoutes');
const claimRoutes = require('./claimRoutes');
const emiRoutes = require('./emiRoutes');
const medicalExpenseRoutes = require('./medicalExpenseRoutes');
const userDocumentRoutes = require('./userDocumentRoutes')
class Router {
    constructor() {
        this.routes = new Map();
        this.compiledRoutes = new Map();
        this.setupRoutes();
    }

    setupRoutes() {
        // Register all converted routes
        userDocumentRoutes.registerRoutes(this);
        medicalExpenseRoutes.registerRoutes(this);
        emiRoutes.registerRoutes(this);
        claimRoutes.registerRoutes(this);
        insuranceRoutes.registerRoutes(this);
        wellnessRoutes.registerRoutes(this);
        emergencyRoutes.registerRoutes(this);
        userRewardRoutes.registerRoutes(this);
        userRoutes.registerRoutes(this);
        taskRoutes.registerRoutes(this);
        supportTicketRoutes.registerRoutes(this);
        subscriptionRoutes.registerRoutes(this);
        subAccountRoutes.registerRoutes(this);
        smartscaleRoutes.registerRoutes(this);
        paymentRoutes.registerRoutes(this);
        medicineRoutes.registerRoutes(this);
        medicalConditionRoutes.registerRoutes(this);
        mealRoutes.registerRoutes(this);
        homePageRoutes.registerRoutes(this);
        contactRoutes.registerRoutes(this);
        healthPageRoutes.registerRoutes(this);
        appleHealthRoutes.registerRoutes(this);
        authRoutes.registerRoutes(this);
        bloodTestRoutes.registerRoutes(this);
        bodyCompositionRoutes.registerRoutes(this);
        coachRoutes.registerRoutes(this);
        coachHistoryRoutes.registerRoutes(this);
        couponRoutes.registerRoutes(this);
        cgmRoutes.registerRoutes(this);
        deviceAuthRoutes.registerRoutes(this);
        dietPageRoutes.registerRoutes(this);
        dietPlanRoutes.registerRoutes(this);
        goalsRoutes.registerRoutes(this);
        fitnessRoutes.registerRoutes(this);
        diseasePredictionRoutes.registerRoutes(this);
        faceScanVitalsRoutes.registerRoutes(this);
        buildRoutes.registerRoutes(this);
        dailyChecklistRoutes.registerRoutes(this);
        adminRoutes.registerRoutes(this);

        // Health check
        this.addRoute('GET', '/health-check', this.healthCheck);

        console.log(`Total routes registered: ${this.routes.size}`);
    }

    addRoute(method, path, handler) {
        console.log(`Adding route: ${method} ${path}`);
        console.log(`Handler type: ${typeof handler}`);
        
        // Normalize the path
        const normalizedPath = this.normalizePath(path);
        const key = `${method}:${normalizedPath}`;
        
        this.routes.set(key, handler);
        
        // Compile the route pattern for better matching
        this.compileRoute(method, normalizedPath);
    }

    normalizePath(path) {
        // Remove trailing slash (except for root)
        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        // Ensure path starts with /
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        return path;
    }

    compileRoute(method, path) {
        const key = `${method}:${path}`;
        
        // Convert path pattern to regex and extract parameter names
        const paramNames = [];
        let regexPattern = path
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex characters
            .replace(/:([^/]+)/g, (match, paramName) => {
                paramNames.push(paramName);
                return '([^/]+)'; // Match any characters except forward slash
            });

        // Ensure exact match by adding start and end anchors
        regexPattern = '^' + regexPattern + '$';
        
        const regex = new RegExp(regexPattern);
        
        this.compiledRoutes.set(key, {
            regex,
            paramNames,
            originalPath: path
        });
        
        console.log(`Compiled route: ${method} ${path} -> ${regexPattern}, params: [${paramNames.join(', ')}]`);
    }

async handleFileUploads(request) {
        try {
            // Handle Azure Functions v4 headers (Headers object vs plain object)
            let contentType;
            if (request.headers && typeof request.headers.get === 'function') {
                // Azure Functions v4 Headers object
                contentType = request.headers.get('Content-Type') || request.headers.get('content-type');
            } else {
                // Fallback for plain object headers
                contentType = request.headers['Content-Type'] || request.headers['content-type'];
            }

            if (!contentType || !contentType.includes('multipart/form-data')) {
                return;
            }

            console.log('Processing multipart/form-data request in router');
            console.log('Content-Type:', contentType);

            // Get the request body - should now be a Buffer from main handler processing
            let bodyBuffer;

            if (Buffer.isBuffer(request.body)) {
                bodyBuffer = request.body;
                console.log('Using processed Buffer body, size:', bodyBuffer.length);
            } else if (request.rawBody && Buffer.isBuffer(request.rawBody)) {
                bodyBuffer = request.rawBody;
                console.log('Using rawBody Buffer, size:', bodyBuffer.length);
            } else if (typeof request.body === 'string') {
                bodyBuffer = Buffer.from(request.body, 'binary');
                console.log('Converting string body to Buffer, size:', bodyBuffer.length);
            } else if (request.body instanceof ReadableStream) {
                // Fallback: if somehow the stream wasn't processed in main handler
                console.log('Found unprocessed ReadableStream, processing now...');
                bodyBuffer = await this.readStreamToBuffer(request.body);
                console.log('Converted ReadableStream to Buffer, size:', bodyBuffer.length);
            } else {
                console.error('Request body type:', typeof request.body);
                console.error('Request body constructor:', request.body?.constructor?.name);
                throw new Error('Unable to process request body - not a Buffer, string, or ReadableStream');
            }
            console.log("body buffer", bodyBuffer);
            // Use parse-multipart library (same as working implementation)
            const boundary = multipart.getBoundary(contentType);
            if (!boundary) {
                throw new Error('Missing boundary in multipart/form-data');
            }

            console.log('Boundary found:', boundary);

            const parts = multipart.Parse(bodyBuffer, boundary);

            if (!parts || parts.length === 0) {
                console.log('No parts found in multipart data');
                throw new Error('No files found in the request');
            }

            console.log('Found', parts.length, 'parts in multipart data');

            const files = {};

            for (const part of parts) {
                console.log('Processing part:', {
                    filename: part.filename,
                    name: part.name,
                    type: part.type,
                    dataSize: part.data?.length
                });
                if (part.filename) {
                    // It's a file - structure it to match controller expectations
                    const fieldName = part.name || 'file';
                    files[fieldName] = {
                        name: part.filename,
                        originalname: part.filename,
                        data: part.data,
                        mimetype: part.type || 'application/octet-stream',
                        size: part.data.length
                    };
                    console.log(`File uploaded: ${part.filename}, size: ${part.data.length} bytes, type: ${part.type}`);
                }
            }
            // Set files and form data on request
            request.files = files;

            console.log('Files processed:', Object.keys(files));

            // Log file structure for debugging (matches controller expectations)
            if (files.file) {
                console.log('Main file structure:', {
                    name: files.file.name,
                    originalname: files.file.originalname,
                    mimetype: files.file.mimetype,
                    size: files.file.size,
                    hasData: !!files.file.data
                });
            }

        } catch (error) {
            console.error('Error handling file uploads:', error);
            throw new Error(`File upload processing failed: ${error.message}`);
        }
    }

    // Helper method to read ReadableStream to Buffer (fallback)
    async readStreamToBuffer(stream) {
        const reader = stream.getReader();
        const chunks = [];

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }

            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;

            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }

            return Buffer.from(result);
        } finally {
            reader.releaseLock();
        }
    }

    // File validation method
    validateFileParts(files) {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        const maxFileSize = 10 * 1024 * 1024; // 10MB

        for (const [fieldName, file] of Object.entries(files)) {
            // Check if file has a name
            if (!file.originalname) {
                throw new Error(`File in field ${fieldName} must have a filename`);
            }

            // Check file size
            if (file.size > maxFileSize) {
                throw new Error(`File ${file.originalname} exceeds maximum size of 10MB`);
            }

            // Check file type
            if (!allowedTypes.includes(file.mimetype)) {
                throw new Error(`File ${file.originalname} has unsupported type: ${file.mimetype}`);
            }

            // Check filename length
            if (file.originalname.length > 255) {
                throw new Error(`Filename ${file.originalname} is too long`);
            }
        }
    }

    async handle(request, context) {
        try {
            console.log(`Handling request: ${request.method} ${request.url}`);
            const method = request.method;
            const url = new URL(request.url);
            let pathname = url.pathname;

            // Remove API prefix if present
            if (pathname.startsWith('/api/v1')) {
                pathname = pathname.replace('/api/v1', '');
            }

            // Normalize pathname
            pathname = this.normalizePath(pathname);

            console.log(`Normalized pathname: ${pathname}`);

            // Find matching route
            const { handler, params } = this.findRoute(method, pathname);

            if (!handler) {
                console.log(`No route found for: ${method} ${pathname}`);
                return {
                    status: 404,
                    jsonBody: {
                        success: false,
                        message: 'Route not found'
                    }
                };
            }

            console.log(`Route matched with params:`, params);

            // Parse query parameters
            const query = {};
            for (const [key, value] of url.searchParams.entries()) {
                // Handle multiple values for the same key
                if (query[key]) {
                    if (Array.isArray(query[key])) {
                        query[key].push(value);
                    } else {
                        query[key] = [query[key], value];
                    }
                } else {
                    query[key] = value;
                }
            }

            // Add params and query to request
            request.params = params;
            request.query = query;

            // Handle file uploads for multipart/form-data requests
            await this.handleFileUploads(request);

            // Validate uploaded files if any
            if (request.files && Object.keys(request.files).length > 0) {
                try {
                    this.validateFileParts(request.files);
                    console.log('File validation passed');
                } catch (validationError) {
                    console.error('File validation failed:', validationError.message);
                    return {
                        status: 400,
                        jsonBody: {
                            success: false,
                            message: validationError.message
                        }
                    };
                }
            }

            console.log(`Request params:`, request.params);
            console.log(`Request query:`, request.query);
            console.log(`Request files:`, request.files ? Object.keys(request.files) : 'none');
            console.log(`Request body:`, request.body);

            // Execute middleware and handler
            if (Array.isArray(handler)) {
                // Handle middleware chain
                for (let i = 0; i < handler.length - 1; i++) {
                    const middlewareResult = await handler[i](request, context);
                    if (middlewareResult && middlewareResult.status !== 200) {
                        return middlewareResult;
                    }
                }
                // Execute final handler
                return await handler[handler.length - 1](request, context);
            } else {
                // Single handler
                return await handler(request, context);
            }

        } catch (error) {
            console.error('Router error:', error);
            return {
                status: 500,
                jsonBody: {
                    success: false,
                    message: 'Internal server error',
                    error: error.message
                }
            };
        }
    }

    findRoute(method, pathname) {
        // Try exact match first (for static routes)
        const exactKey = `${method}:${pathname}`;
        if (this.routes.has(exactKey)) {
            return { handler: this.routes.get(exactKey), params: {} };
        }

        // Try pattern matching using compiled routes
        for (const [key, compiledRoute] of this.compiledRoutes.entries()) {
            const [routeMethod] = key.split(':');
            if (routeMethod !== method) continue;

            const match = pathname.match(compiledRoute.regex);
            if (match) {
                const params = {};
                
                // Extract parameters from the match
                for (let i = 0; i < compiledRoute.paramNames.length; i++) {
                    const paramName = compiledRoute.paramNames[i];
                    const paramValue = match[i + 1]; // match[0] is the full match
                    params[paramName] = decodeURIComponent(paramValue);
                }

                console.log(`Route matched: ${key}, extracted params:`, params);
                return { handler: this.routes.get(key), params };
            }
        }

        return { handler: null, params: {} };
    }

    // Legacy method for backward compatibility
    matchPath(pattern, pathname) {
        // Normalize both paths
        pattern = this.normalizePath(pattern);
        pathname = this.normalizePath(pathname);

        const patternParts = pattern.split('/').filter(part => part !== '');
        const pathParts = pathname.split('/').filter(part => part !== '');

        if (patternParts.length !== pathParts.length) {
            return null;
        }

        const params = {};
        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            const pathPart = pathParts[i];

            if (patternPart.startsWith(':')) {
                const paramName = patternPart.slice(1);
                params[paramName] = decodeURIComponent(pathPart);
            } else if (patternPart.toLowerCase() !== pathPart.toLowerCase()) {
                return null;
            }
        }

        return params;
    }

    async healthCheck(request, context) {
        return responseWrapper.success({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
            totalRoutes: this.routes.size,
            compiledRoutes: this.compiledRoutes.size
        });
    }

    // Method to list all registered routes (useful for debugging)
    listRoutes() {
        console.log('\n=== Registered Routes ===');
        const routesByPrefix = {};

        for (const [key] of this.routes.entries()) {
            const [method, path] = key.split(':');
            const prefix = path.split('/')[1] || 'root';

            if (!routesByPrefix[prefix]) {
                routesByPrefix[prefix] = [];
            }
            routesByPrefix[prefix].push(`${method} ${path}`);
        }

        Object.keys(routesByPrefix).sort().forEach(prefix => {
            console.log(`\n${prefix.toUpperCase()}:`);
            routesByPrefix[prefix].sort().forEach(route => {
                console.log(`  ${route}`);
            });
        });

        console.log(`\nTotal: ${this.routes.size} routes`);
        console.log(`Compiled: ${this.compiledRoutes.size} patterns\n`);
    }

    // Debug method to test route matching
    testRoute(method, path) {
        console.log(`\n=== Testing Route: ${method} ${path} ===`);
        const result = this.findRoute(method, path);
        console.log('Result:', result);
        return result;
    }
}

module.exports = new Router();