// server.js
import express from 'express';
import session from 'express-session';
import { OAuth2Client } from 'google-auth-library';
import { handler } from './build/handler.js';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import listEndpoints from 'express-list-endpoints';
import axios from 'axios';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { RouteServices } from './serverutils.js';
import crypto from 'crypto';
import { randomBytes } from 'crypto';


// Import processors and utilities
import { PlanLoader } from './routes/EventProcessor/PlanLoader.js';
import { EventListener } from './routes/EventProcessor/EventListener.js';
import { PropertyResolver } from './routes/EventProcessor/PropertyResolver.js';

import { ActivityExecutor } from './routes/EventProcessor/activityExecutor.js';
import { EventProcessor } from './routes/EventProcessor/eventProcessor2.js';

import { createLogger } from './routes/EventProcessor/logger.js';
// import { createEventRoutes } from './routes/EventProcessor/eventEndpointsRoutes.js';
import { WebSocketManager } from './serverutils/webSocketServer.js';
import { getFhirAccessToken } from './src/lib/auth/auth.js';
import { 
  auth, 
  healthcare, 
  BASE_PATH,
  PROJECT_ID, 
  LOCATION, 
  DATASET_ID, 
  FHIR_STORE_ID 
} from './serverutils.js';

// Import all routes
import {
  api211Routes,
  availabilityRoutes,
  conditionRoutes,
  communicationRoutes,
  consentRoutes,
  emailRoutes,
  eventDefinitionRoutes,
  exclusionRoutes,
  fileuploadRoutes,
  goalRoutes,
  organizationRoutes,
  patientRoutes,
  practitionerRoutes,
  provenanceRoutes,
  roleRoutes,
  serverstatsRoutes,
  serviceRequestRoutes,
  taskRoutes,
  activityDefinitionRoutes,
  planDefinitionRoutes,
  timerRoutes,
  templateActivityRoutes,
  templateEventRoutes,
  templatePlanRoutes,
  inviteRoutes,
  endpointRoutes,
  testActivityRoutes
} from './routes/index.js'; 


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize logger
const logger = createLogger({
  service: 'cori-server',
  level: process.env.LOG_LEVEL || 'debug'
});

dotenv.config();


const REQUIRED_ENV_VARS = [
  'PROJECT_ID',
  'LOCATION',
  'DATASET_ID',
  'FHIR_STORE_ID'
];

REQUIRED_ENV_VARS.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

logger.info('Initializing with FHIR configuration:', {
  baseUrl: FHIR_BASE_URL,
  project: PROJECT_ID,
  location: LOCATION,
  dataset: DATASET_ID,
  store: FHIR_STORE_ID
});



// Initialize express app
const app = express();
let eventProcessor = null;
let server = null;



// Initialize OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.CLIENT_URL}${BASE_PATH}/auth/google/callback`
);

// Initialize route services
const routeServices = new RouteServices(logger, BASE_PATH, oauth2Client);


function createServer() {
  try {
    const httpsOptions = {
      key: fs.readFileSync('./.certs/localhost-key.pem'),
      cert: fs.readFileSync('./.certs/localhost.pem'),
    };

    const server = https.createServer(httpsOptions, app);

    server.on('error', (err) => {
      logger.error('Server encountered an error:', {
        message: err.message,
        stack: err.stack,
      });
    });

    return server;
  } catch (error) {
    logger.error('Failed to create server:', error);
    throw error;
  }
}


async function getEpicAccessToken(code) {
  const tokenUrl = process.env.EPIC_TOKEN_URL;
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.EPIC_REDIRECT_URI,
    client_id: process.env.EPIC_CLIENT_ID,
    client_secret: process.env.EPIC_CLIENT_SECRET,
  });

  try {
    const response = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch Epic access token', {
      error: error.response?.data || error.message,
    });
    throw error;
  }
}

// FHIR API caller
async function callFhirApi(method, path, data = null) {
  try {
    const accessToken = await getFhirAccessToken();
    logger.debug('FHIR API call initiated:', {
      method,
      path,
      hasData: !!data
    });

    const url = path.startsWith('/') ? `${FHIR_BASE_URL}${path}` : `${FHIR_BASE_URL}/${path}`;
    
    const config = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    };

    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/fhir+json';
    }

    logger.debug('Making FHIR API request:', {
      url,
      method,
 //     headers: config.headers
    });

    const response = await axios(config);
    
    logger.debug('FHIR API call successful:', {
      status: response.status,
      dataReceived: !!response.data
    });

    return response.data;
  } catch (error) {
    logger.error('FHIR API call failed', {
      method,
      path,
      error: {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      }
    });
    throw error;
  }
}

// Initialize activity executor
const activityExecutor = new ActivityExecutor(new PropertyResolver(), {
  callFhirApi,
  logger
});

// Configure passport
function configurePassport() {
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
  
  passport.use(new FacebookStrategy({
    clientID: process.env.FB_APP_ID,
    clientSecret: process.env.FB_APP_SECRET,
    callbackURL: `${process.env.CLIENT_URL}${BASE_PATH}/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'email', 'photos'],
    passReqToCallback: true
  }, (req, accessToken, refreshToken, profile, done) => {
    const user = {
      id: profile.id,
      email: profile.emails?.[0].value,
      name: profile.displayName,
      picture: profile.photos?.[0].value,
      fbToken: accessToken
    };
    return done(null, user);
  }));
}

// Initialize event processing
async function initializeEventProcessing() {
  try {
    logger.info('Starting event processor initialization');
    
    // Initialize our core components
    const planLoader = new PlanLoader();
    const eventListener = new EventListener(app);
    
    // Create and initialize event processor with our components
    eventProcessor = new EventProcessor({
      planLoader,
      eventListener,
      activityExecutor,
      callFhirApi,
      logger
    });
    
    await eventProcessor.initialize();
    
    // Setup WebSocket manager
    const wsManager = new WebSocketManager(server, logger);
    app.locals.wsManager = wsManager;
    eventProcessor.setWebSocketManager(wsManager);
    
  } catch (error) {
    logger.error('Failed to initialize event processor:', error);
    throw error;
  }
}

// Configure express middleware
function configureMiddleware() {
  app.use(cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.CLIENT_URL,                      // Your client URL
        /\.epic\.com$/,                              // Any Epic domain (regex for subdomains)
        'https://fhir.epic.com',                     // Epic FHIR sandbox
      ];
  
      // Check if origin is in the list or matches regex
      if (!origin || allowedOrigins.some(o => (typeof o === 'string' && o === origin) || (o instanceof RegExp && o.test(origin)))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));

  app.use(express.json());
  app.use(express.static('public'));
  app.use(routeServices.handleError.bind(routeServices));
  app.use(routeServices.logRequest.bind(routeServices));
  
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
 //     sameSite: 'lax',
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000
    }
  }));
  
  app.set('trust proxy', 1); // 1 means trusting the first proxy
  app.set('trust proxy', 2); // 1 means trusting the first proxy

  app.use(passport.initialize());
  app.use(passport.session());

  //allow to run in iframe
  app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.epic.com");
    next();
  });


}

function extractOAuthEndpoint(metadata, endpointType) {
  const rest = metadata.rest;
  if (!rest || !rest.length) {
      return null;
  }

  const securityExtensions = rest[0].security.extension || [];
  const smartExtension = securityExtensions.find(ext =>
      ext.url === 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris'
  );

  if (!smartExtension) {
      return null;
  }

  const endpointExt = smartExtension.extension.find(ext => ext.url === endpointType);
  return endpointExt ? endpointExt.valueUri : null;
}

// Configure routes in correct order
function configureRoutes() {
  // 1. Auth routes first
  routeServices.setupAuthRoutes(app);
  
  app.get('/epic/launch', async (req, res) => {
    const { iss, launch } = req.query;

    logger.info('Epic Launch endpoint hit', { endpoint: req.path, params: req.query });

    if (iss && launch) {
        try {
            // Validate iss URL
            let issUrl;
            try {
                issUrl = new URL(iss);
            } catch (err) {
                throw new Error('Invalid iss URL');
            }

            // Store iss in session for later use
            req.session.iss = iss;

            // Fetch the SMART configuration from the FHIR server's metadata
            const metadataUrl = `${iss}/metadata`;
            logger.info('Fetching SMART configuration', { metadataUrl });

            const metadataResponse = await axios.get(metadataUrl, {
                headers: { 'Accept': 'application/json' }
            });

            // Extract OAuth endpoints
            const authEndpoint = extractOAuthEndpoint(metadataResponse.data, 'authorize');
            const tokenEndpoint = extractOAuthEndpoint(metadataResponse.data, 'token');

            if (!authEndpoint || !tokenEndpoint) {
                throw new Error('Authorization or token endpoint not found in SMART configuration');
            }

            // Store token endpoint in session for later use
            req.session.tokenEndpoint = tokenEndpoint;

            // Generate a unique state parameter
            const oauthState = crypto.randomBytes(16).toString('hex');
            req.session.oauthState = oauthState;

            // Construct authorization URL
            const params = new URLSearchParams({
                response_type: 'code',
                client_id: process.env.EPIC_CLIENT_ID,
                redirect_uri: process.env.EPIC_REDIRECT_URI, // Should be your callback endpoint
                launch: launch,
                scope: 'launch/patient openid fhirUser',
                state: oauthState,
                aud: iss,
            });

            const fullAuthUrl = `${authEndpoint}?${params.toString()}`;
            logger.info('Redirecting to Epic authorization', { fullAuthUrl });

            return res.redirect(fullAuthUrl);
        } catch (error) {
            logger.error('Error initiating Epic authorization', { message: error.message });
            return res.status(500).json({
                error: 'Failed to initiate Epic authorization',
                details: error.message
            });
        }
    }

    // Missing required parameters
    logger.error('Invalid launch request - missing required parameters');
    return res.status(400).json({
        error: 'Invalid request',
        details: 'Missing required parameters'
    });
});

  app.get('/epic/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;
    
      if (error) {
        // Log the error and provide feedback
        console.error('Epic authorization error:', error_description || error);
        return res.status(400).send(`Authorization failed: ${error_description || error}`);
      }

    logger.info('Epic Callback endpoint hit', { endpoint: req.path, params: req.query });

    // Error returned from Epic authorization server
    if (error) {
        logger.error('Epic authorization error', { error, error_description, state });
        return res.status(400).json({
            error: 'Authorization failed',
            details: error_description || error
        });
    }

    if (code && state) {
        logger.info('Received authorization code callback');
        try {
            // Verify state parameter matches the one stored in session
            if (state !== req.session.oauthState) {
                logger.error('State parameter mismatch', { expected: req.session.oauthState, received: state });
                return res.status(400).send('Invalid state parameter');
            }

            // Retrieve token endpoint from session
            const tokenUrl = req.session.tokenEndpoint;
            if (!tokenUrl) {
                throw new Error('Token endpoint not found in session');
            }

            // Prepare token request parameters
            const tokenParams = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.EPIC_REDIRECT_URI, // Should match the redirect_uri used in the authorization request
                client_id: process.env.EPIC_CLIENT_ID
            });

            // Include client_secret if needed (for confidential clients)
            if (process.env.EPIC_CLIENT_SECRET) {
                tokenParams.append('client_secret', process.env.EPIC_CLIENT_SECRET);
            }

            logger.info('Exchanging authorization code for access token');
            const tokenResponse = await axios.post(tokenUrl, tokenParams.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const tokenData = tokenResponse.data;
            logger.info('Successfully received access token');

            // Store token and patient context securely
            req.session.epicAccessToken = tokenData.access_token;
            if (tokenData.patient) {
                req.session.patientId = tokenData.patient;
            }

            // Handle id_token if OpenID Connect is used
            if (tokenData.id_token) {
                // Verify and decode id_token (JWT)
                const decodedIdToken = jwt.decode(tokenData.id_token, { complete: true });
                // TODO: Verify token signature and claims according to OpenID Connect specs
                req.session.idToken = decodedIdToken;
            }

            // Clear sensitive data from session
            delete req.session.oauthState;
            delete req.session.tokenEndpoint;
            delete req.session.iss;

            return res.redirect('/'); // Redirect to your application's home page or appropriate route
        } catch (error) {
            logger.error('Error exchanging code for token', { message: error.message });
            return res.status(500).send('Failed to complete Epic authorization.');
        }
    }

    // Missing required parameters
    logger.error('Invalid callback request - missing required parameters');
    return res.status(400).json({
        error: 'Invalid request',
        details: 'Missing required parameters'
    });
});

    app.use(`${BASE_PATH}/events`, 
      routeServices.logEventRequest.bind(routeServices),
      createEventRoutes(eventProcessor.eventListener, logger)
    );
  


  // 3. API routes
  const apiRoutes = {
    'api211': api211Routes,
    'availability': availabilityRoutes,
    'condition': conditionRoutes,
    'communication': communicationRoutes,
    'consent': consentRoutes,
    'email': emailRoutes,
    'exclusion': exclusionRoutes,
    'eventdefinition': eventDefinitionRoutes,
    'fileupload': fileuploadRoutes,
    'goal': goalRoutes,
    'organization': organizationRoutes,
    'patient': patientRoutes,
    'practitioner': practitionerRoutes,
    'provenance': provenanceRoutes,
    'role': roleRoutes,
    'serverstats': serverstatsRoutes,
    'servicerequest': serviceRequestRoutes,
    'task': taskRoutes,
    'activityDefinition': activityDefinitionRoutes,
    'planDefinition': planDefinitionRoutes,
    'timer': timerRoutes,
    'templates/activities': templateActivityRoutes,
    'templates/events': templateEventRoutes,
    'templates/plans': templatePlanRoutes,
    'test-activity': testActivityRoutes,
    'invite': inviteRoutes,
    'webhook': endpointRoutes
  };
  
  routeServices.setupAPIRoutes(app, apiRoutes);
  
  // 4. Root routes
  app.post(`${BASE_PATH}/`, (req, res) => res.status(200).send());
  app.post("/", (req, res) => res.status(200).send());
  
  // 5. SvelteKit handler (catch-all)
  app.use(handler);
}

// Server startup
async function startServer(server_arg) {
  const PORT = process.env.SERVER_PORT || 3001;

  try {
    // First, we'll initialize our ECA system components
    logger.info('Beginning ECA system initialization');
    
    // Initialize the activity executor first since other components depend on it
    logger.info('Initializing activity executor');
    try {
      await activityExecutor.initialize();
      logger.info('Activity executor initialized successfully');
    } catch (error) {
      logger.error('Activity executor initialization failed', {
        error: error.message,
        stack: error.stack,
        details: error.response?.data
      });
      throw new Error('Failed to initialize activity executor: ' + error.message);
    }

    // Now initialize the event processing system
    logger.info('Initializing event processing system');
    try {
      await initializeEventProcessing();
      if (!eventProcessor?.initialized) {
        throw new Error('Event processor initialization check failed');
      }
      logger.info('Event processing system initialized successfully');
    } catch (error) {
      logger.error('Event processing initialization failed', {
        error: error.message,
        stack: error.stack
      });
      throw new Error('Failed to initialize event processing: ' + error.message);
    }

    // Now proceed with the server startup
    logger.info('Starting server initialization');
    await new Promise((resolve, reject) => {
      // Set up error handler for server startup
      server_arg.on('error', (err) => {
        logger.error('Server failed to start:', err);
        reject(err);
      });

      // Start listening on the specified port
      server_arg.listen(PORT, () => {
        logger.info(`HTTPS Server running on port ${PORT}`);
        
        // Log the state of our ECA system
        logger.info('ECA System Status', {
          activityExecutor: {
            initialized: true,
            activeExecutions: activityExecutor.getActiveExecutions?.()?.length || 0
          },
          eventProcessor: {
            initialized: eventProcessor.initialized,
            webhookCount: eventProcessor.webhookEvents?.size || 0,
            registeredPaths: Array.from(eventProcessor.webhookEvents?.keys() || [])
          }
        });
        
        resolve();
      });
    });

    return server_arg;

  } catch (error) {
    logger.error('Server startup failed', {
      phase: error.message.includes('activity executor') ? 'Activity Executor Initialization' :
             error.message.includes('event processing') ? 'Event Processing Initialization' :
             'Server Startup',
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

async function main() {
  try {
    logger.info('Starting application initialization');

    // First initialize middleware and basic routes
    // These need to be set up before any component that might need to use them
    logger.info('Initializing middleware and routes');
    configureMiddleware();
    configurePassport();
    configureRoutes();

    // Create the HTTPS server early since other components need it
    logger.info('Creating HTTPS server');
    const server = createServer();

    // Initialize the core ECA system components
    logger.info('Initializing ECA system components');
    const propertyResolver = new PropertyResolver();
    const activityExecutor = new ActivityExecutor(propertyResolver, {
      callFhirApi,
      logger
    });
    
    // Initialize WebSocket manager before event processor
    // This ensures it's available for event processor initialization
    logger.info('Initializing WebSocket manager');
    const wsManager = new WebSocketManager(server, logger);
    app.locals.wsManager = wsManager;

    // Now initialize the event processor with all required dependencies
    logger.info('Initializing event processor');
    const planLoader = new PlanLoader();
    const eventListener = new EventListener(app);
    
    eventProcessor = new EventProcessor({
      planLoader,
      eventListener,
      activityExecutor,
      callFhirApi,
      logger,
      wsManager // Provide WebSocket manager during initialization
    });

    // Initialize the event processor
    await eventProcessor.initialize();
    logger.info('Event processor initialized successfully', {
      status: {
        plansLoaded: planLoader.getLoadedPlanCount(),
        endpointsRegistered: eventListener.getRegisteredEndpointCount()
      }
    });

    // Start the server after all components are initialized
    logger.info('Starting server');
    await startServer(server);

    // Log successful startup with component status
    logger.info('Application started successfully', {
      components: {
        server: 'running',
        websocket: {
          status: 'running',
          clientCount: wsManager.wss.clients.size
        },
        eventProcessor: {
          status: 'running',
          initialized: eventProcessor.initialized,
          activeEndpoints: Array.from(eventProcessor.eventListener.getRegisteredEndpoints())
        },
        activityExecutor: {
          status: 'running',
          activeExecutions: activityExecutor.getActiveExecutions().length
        }
      }
    });

  } catch (error) {
    // Enhanced error logging with component context
    logger.error('Application failed to start', {
      error: {
        message: error.message,
        stack: error.stack,
        component: error.message.includes('WebSocket') ? 'WebSocket Manager' :
                  error.message.includes('event processor') ? 'Event Processor' :
                  error.message.includes('server') ? 'Server' :
                  'Unknown Component'
      }
    });
    process.exit(1);
  }
}

// Shutdown handling
function setupShutdownHandlers() {
  async function cleanup() {
    logger.info('Initiating shutdown');
    try {
      if (eventProcessor) {
        const activeExecutions = eventProcessor.activityExecutor.getActiveExecutions();
        logger.info(`Cleaning up ${activeExecutions.length} active executions`);
        await eventProcessor.activityExecutor.cleanup();

        if (eventProcessor.wsManager) {
          const clientCount = eventProcessor.wsManager.wss.clients.size;
          logger.info(`Closing ${clientCount} WebSocket connections`);
          eventProcessor.wsManager.wss.clients.forEach(client => {
            client.close(1000, 'Server shutting down');
          });
        }
      }
    } catch (error) {
      logger.error('Error during cleanup:', error);
    } finally {
      logger.info('Shutdown complete');
      process.exit(0);
    }
  }

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', () => {
    logger.info('SIGINT received');
    process.emit('SIGTERM');
  });
}



setupShutdownHandlers();
main();

//export { eventProcessor };