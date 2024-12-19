// server.js
import express from 'express';
import session from 'express-session';
import { OAuth2Client } from 'google-auth-library';
import { handler } from './build/handler.js';
import https from 'https';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import listEndpoints from 'express-list-endpoints';
import axios from 'axios';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import crypto from 'crypto';
import { randomBytes } from 'crypto';

// Services for Oauth login and other utils
import { RouteServices } from './serverutils.js';

// Import processors and utilities
import { TaskManager }      from './routes/EventProcessor/TaskManager.js';
import { PropertyResolver } from './routes/EventProcessor/PropertyResolver.js';
import { EventManager }     from './routes/EventProcessor/EventManager.js';
import { ActivityExecutor } from './routes/EventProcessor/ActivityExecutor.js';
import { PlanLoader } from './routes/EventProcessor/PlanLoader.js';


 import { createLogger } from './routes/EventProcessor/logger.js';

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

import { createWorkflowRoutes } from './routes/workflowRoutes.js';

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
let taskManager = null;
let activityExecutor = null;
let propertyResolver = null;
let planLoader = null;
let eventManager = null;




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

    // Create the server instance directly
    const httpsServer = https.createServer(httpsOptions, app);

    // Set up error handler
    httpsServer.on('error', (err) => {
      logger.error('Server encountered an error:', {
        message: err.message,
        stack: err.stack,
      });
    });

    // Return the actual server instance
    return httpsServer;

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

// fhirClient that wraps callFhirApi 
const fhirClient = {
      search(resourceType, params) {
          const query = new URLSearchParams(params).toString();
          const path = `/${resourceType}${query ? '?' + query : ''}`;
          return callFhirApi('GET', path);
        },

      read(resourceType, id) {
        return callFhirApi('GET', `/${resourceType}/${id}`);
      },
      create(resource) {
        return callFhirApi('POST', `/${resource.resourceType}`, resource);
      },
      update(resource) {
        return callFhirApi('PUT', `/${resource.resourceType}/${resource.id}`, resource);
      }
  // add more as needed
};

// FHIR API caller
async function callFhirApi(method, path, data = null) {
  console.log ("callFhirApi: ", method, path, data);

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
  app.set('trust proxy', 2); 

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

            logger.info('EPIC Launch, Redirect URI sent to Epic:', process.env.EPIC_REDIRECT_URI);

            // Construct authorization URL
            const params = new URLSearchParams({
                response_type: 'code',
                client_id: process.env.EPIC_CLIENT_ID,
                redirect_uri: process.env.EPIC_REDIRECT_URI, 
                launch: launch,
           //     scope: 'launch/patient openid fhirUser',
                scope: 'launch openid fhirUser',
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

  app.get('/epic/callback6/', async (req, res) => {
    console.log('EPIC Callback hit with query:', req.query);
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
              code, // From the callback query
              redirect_uri: process.env.EPIC_REDIRECT_URI, // Must match the redirect_uri used during authorization
              client_id: process.env.EPIC_CLIENT_ID, // From your environment variables
       //       client_secret: process.env.EPIC_CLIENT_SECRET // Required for confidential apps
          });
      
          logger.info('Exchanging authorization code for access token', {
              tokenUrl,
              params: tokenParams.toString(),
          });
      
          const tokenResponse = await axios.post(tokenUrl, tokenParams.toString(), {
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Accept': 'application/json', // Expect JSON response
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
                try {
                    // Decode and verify the JWT
                    const decodedIdToken = jwt.decode(tokenData.id_token, { complete: true });
                    // TODO: Add verification logic (e.g., signature validation) if necessary
                    req.session.idToken = decodedIdToken;
                    logger.info('Decoded id_token:', decodedIdToken);
                } catch (err) {
                    logger.error('Error decoding id_token:', err.message);
                    throw new Error('Failed to decode id_token');
                }
            }

            // Clear sensitive data from session
            delete req.session.oauthState;
            delete req.session.tokenEndpoint;
            delete req.session.iss;

            return res.redirect('/'); // Redirect to your application's home page or appropriate route
        } catch (error) {
          logger.error('Token exchange failed', {
              message: error.message,
              response: error.response?.data,
              status: error.response?.status,
              headers: error.response?.headers,
          });
      
          throw new Error('Failed to exchange authorization code for token');
      }
    }

    // Missing required parameters
    logger.error('Invalid callback request - missing required parameters');
    return res.status(400).json({
        error: 'Invalid request',
        details: 'Missing required parameters'
    });
});

//OLD event endpoints, this is now managed in EventManager
/*     app.use(`${BASE_PATH}/events`, 
      routeServices.logEventRequest.bind(routeServices),
      createEventRoutes(eventProcessor.eventListener, logger)
    ); */
  


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
    'webhook': endpointRoutes,
  
  };
  
  routeServices.setupAPIRoutes(app, apiRoutes);
 
  const workflowRoutes = createWorkflowRoutes(taskManager, planLoader, activityExecutor, eventManager);
  app.use(`${BASE_PATH}/api/workflow`, workflowRoutes);
  
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
        
        
        resolve();
      });
    });

    return server_arg;

  } catch (error) {
    logger.error('Server startup failed', {
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
    logger.info('Initializing middleware');
    configureMiddleware();
    configurePassport();
  

    // Create the HTTPS server early since other components need it
    logger.info('Creating HTTPS server');
    const server = createServer();

    // Initialize the core ECA system components
    logger.info('Initializing ECA system components');

    propertyResolver = new PropertyResolver();
    logger.info('Property Resolver initialized');

    planLoader = new PlanLoader(fhirClient);
    logger.info('Plan Loader initialized');

    // ContextProvider needs to be defined.  It directs how to access context (username etc)
    taskManager = new TaskManager(fhirClient, process.env.SYSTEM_DEVICE_ID);
    await taskManager.initialize();
    logger.info('Task Manager initialized');


    activityExecutor = new ActivityExecutor(propertyResolver, fhirClient, taskManager);
    logger.info('Activity Executor initialized');

    // Now initialize the event processor with all required dependencies
    eventManager = new EventManager(fhirClient, taskManager, planLoader, activityExecutor, app);
     
     await eventManager.initialize();
     logger.info('Event Manager initialized successfully');



    // Initialize WebSocket manager before event processor
    // This ensures it's available for event processor initialization
    logger.info('Initializing WebSocket manager');
    const wsManager = new WebSocketManager(server, logger);  // Pass server directly
    app.locals.wsManager = wsManager;
    logger.info('WebSocket manager initialized');

 // Now configure routes
    logger.info('Configuring routes');
    configureRoutes();

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
/*         eventProcessor: {
          status: 'running',
          initialized: eventProcessor.initialized,
          activeEndpoints: Array.from(eventProcessor.eventListener.getRegisteredEndpoints())
        },
        activityExecutor: {
          status: 'running',
          activeExecutions: activityExecutor.getActiveExecutions().length
        } */
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
      if (taskManager) {
        const activeTasks = await taskManager.findInProgressTasks();
        logger.info(`Found ${activeTasks.length} active tasks to cleanup`);
        
        for (const task of activeTasks) {
            // Mark task as stopped rather than leaving it in-progress
            await taskManager.updateTaskStatus(task.id, 'stopped', {
                reason: 'System shutdown'
            });
            
            await taskManager.createProvenance(task.id, 'system-shutdown', {
                reason: 'Controlled shutdown',
                timestamp: new Date().toISOString()
            });
        }
      }

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

