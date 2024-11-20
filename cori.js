// server.js
import express from 'express';
import session from 'express-session';
import { OAuth2Client } from 'google-auth-library';
import { handler } from './build/handler.js';
import https from 'https';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import listEndpoints from 'express-list-endpoints';
import axios from 'axios';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { RouteServices } from './serverutils.js';

// Import processors and utilities
import { ActivityExecutor } from './routes/EventProcessor/activityExecutor.js';
import { EventProcessor } from './routes/EventProcessor/eventProcessor2.js';
import { createLogger } from './routes/EventProcessor/logger.js';
import { createEventRoutes } from './routes/EventProcessor/eventEndpointsRoutes.js';
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
const activityExecutor = new ActivityExecutor({
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
    
    eventProcessor = new EventProcessor(callFhirApi, activityExecutor, logger);
    await eventProcessor.initialize();
    
    const httpsOptions = {
      key: fs.readFileSync('./certs/localhost-key.pem'),
      cert: fs.readFileSync('./certs/localhost.pem')
    };
    
    const server = https.createServer(httpsOptions, app);
    
    const wsManager = new WebSocketManager(server, logger);
    app.locals.wsManager = wsManager;
    eventProcessor.setWebSocketManager(wsManager);
    
    return server;
  } catch (error) {
    logger.error('Failed to initialize event processor:', error);
    throw error;
  }
}

// Configure express middleware
function configureMiddleware() {
  app.use(cors({
    origin: process.env.CLIENT_URL,
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
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    }
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());
}

// Configure routes in correct order
function configureRoutes() {
  // 1. Auth routes first
  routeServices.setupAuthRoutes(app);
  
  // 2. Event routes
  app.use(`${BASE_PATH}/events`, 
    routeServices.logEventRequest.bind(routeServices),
    createEventRoutes(eventProcessor, logger)
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
async function startServer() {
  try {
    logger.info('Starting server initialization');
    
    configureMiddleware();
    configurePassport();

    logger.info('Initializing activity executor');
    try {
      await activityExecutor.initialize();
      logger.info('Activity executor initialized successfully');
    } catch (error) {
      logger.error('Activity executor initialization failed:', {
        error: error.message,
        stack: error.stack,
        details: error.response?.data
      });
      throw error;
    }
    
    server = await initializeEventProcessing();
    
    if (!eventProcessor?.initialized) {
      throw new Error('Event processor initialization failed');
    }
    
    configureRoutes();
    
    // list endpoints to console
    const endpoints = listEndpoints(app)
      .filter(endpoint => !endpoint.path.startsWith('/api'))
      .sort((a, b) => a.path.localeCompare(b.path));
    
    logger.info(`Found ${endpoints.length} non-API endpoints:`);
    endpoints.forEach(endpoint => {
      logger.info('Endpoint:', {
        path: endpoint.path,
        methods: endpoint.methods.join(', '),
   //     middlewares: endpoint.middlewares.join(', ')
      });
    });
    
    //  Start server
    const PORT = process.env.SERVER_PORT || 3001;
    await new Promise((resolve, reject) => {
      server.listen(PORT, (err) => {
        if (err) reject(err);
        else {
          logger.info(`HTTPS Server running on port ${PORT}`, {
            eventProcessorState: {
              initialized: eventProcessor.initialized,
              webhookCount: eventProcessor.webhookEvents.size,
              registeredPaths: Array.from(eventProcessor.webhookEvents.keys())
            }
          });
          resolve();
        }
      });
    });
    
    return server;
  } catch (error) {
    logger.error('Server startup failed:', error);
    throw error;
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
      
      if (server) {
        await new Promise((resolve, reject) => {
          server.close((err) => {
            if (err) reject(err);
            else {
              logger.info('Server closed successfully');
              resolve();
            }
          });
        });
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

// Start the server
setupShutdownHandlers();
startServer().catch(error => {
  logger.error('Unhandled error during server startup:', error);
  process.exit(1);
});

export { eventProcessor };