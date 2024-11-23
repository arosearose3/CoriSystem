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
/* const activityExecutor = new ActivityExecutor({
  callFhirApi,
  logger
}); */

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
    
 /*    const httpsOptions = {
      key: fs.readFileSync('./certs/localhost-key.pem'),
      cert: fs.readFileSync('./certs/localhost.pem')
    }; */
/* 
    const httpsOptions = {
      key: fs.readFileSync('./certs/private.key'),
      cert: fs.readFileSync('./certs/certificate.crt')
    }; */
/* 
    const httpsOptions = {
     
      key: fs.readFileSync(path.resolve(__dirname, './certs/private.key')),
      cert: fs.readFileSync(path.resolve(__dirname, './certs/certificate.crt')),
      ca: fs.readFileSync(path.resolve(__dirname, './certs/ca_bundle.crt'))
    };

    console.log ("dirname:", __dirname);
    console.log('Key path:', path.resolve(__dirname, './certs/private.key'));
 */


    
  const wsManager = new WebSocketManager(server, logger);
//  const wsManager = null;
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

// Configure routes in correct order
function configureRoutes() {
  // 1. Auth routes first
  routeServices.setupAuthRoutes(app);
  
  // Epic auth route

  app.get('/epic/callback', async (req, res) => {
      const { iss, launch, code, state } = req.query;
    
      // Case 1: Initial Launch from Epic
      if (iss && launch) {
        try {
          const authUrl = `${iss}/oauth2/authorize?response_type=code&client_id=${process.env.EPIC_CLIENT_ID}&redirect_uri=${process.env.EPIC_REDIRECT_URI}&launch=${launch}&scope=launch/patient openid fhirUser&state=uniqueStateIdentifier`;
    
          // Redirect the user to Epic's authorization server
          return res.redirect(authUrl);
        } catch (error) {
          logger.error('Error processing launch request from Epic:', error);
          return res.status(500).send('Failed to process launch request.');
        }
      }
    
      // Case 2: Callback After Authorization
      if (code) {
        try {
          // Exchange the authorization code for an access token
          const tokenResponse = await axios.post(`${process.env.EPIC_TOKEN_URL}`, {
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.EPIC_REDIRECT_URI,
            client_id: process.env.EPIC_CLIENT_ID,
            client_secret: process.env.EPIC_CLIENT_SECRET,
          }, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
    
          const tokenData = tokenResponse.data;
    
          logger.info('Epic access token received', tokenData);
    
          // Store the access token securely
          req.session.epicAccessToken = tokenData.access_token;
    
          // Redirect to the main app or dashboard
          return res.redirect(`${process.env.CLIENT_URL}/dashboard`);
        } catch (error) {
          logger.error('Error exchanging authorization code:', error);
          return res.status(500).send('Failed to exchange authorization code for token.');
        }
      }
    
      // If neither case matches, return an error
      res.status(400).send('Invalid request: Missing required parameters.');
    });

  // 2. Event routes
/*   app.use(`${BASE_PATH}/events`, 
    routeServices.logEventRequest.bind(routeServices),
    createEventRoutes(eventProcessor, logger)
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
 
/*     logger.info('Initializing activity executor');
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
    } */

    // list endpoints to console
/*     const endpoints = listEndpoints(app)
      .filter(endpoint => !endpoint.path.startsWith('/api'))
      .sort((a, b) => a.path.localeCompare(b.path));
    
    logger.info(`Found ${endpoints.length} non-API endpoints:`);
    
    endpoints.forEach(endpoint => {
      logger.info('Endpoint:', {
        path: endpoint.path,
        methods: endpoint.methods.join(', '),
   //     middlewares: endpoint.middlewares.join(', ')
      });
    }); */
    
    //  Start server
    const PORT = process.env.SERVER_PORT || 3001;

    try{
      console.log ("start - before Promise");
    await new Promise((resolve, reject) => {
     
    
      // Listen for 'error' events on the server
      console.log ("start - before on error");
      server_arg.on('error', (err) => {
        logger.error('Server failed to start:', err);
        reject(err);
      });
    
      logger.info('start - before server.listen');

      server_arg.listen(PORT, () => {
        logger.info(`HTTPS Server running on port ${PORT}`);
        resolve();
      });

      // Start the server
/*       server.listen(PORT, () => {
        logger.info(`HTTPS Server running on port ${PORT}`);
        
        logger.info('Server Details', {
          eventProcessorState: {
            initialized: eventProcessor.initialized,
            webhookCount: eventProcessor.webhookEvents.size,
            registeredPaths: Array.from(eventProcessor.webhookEvents.keys())
          }
        });
        
        logger.info('start - before resolve');
        resolve();
      }); */
    });


    return server_arg;

  } catch (error) {
    logger.error('Server startup failed:', error);
    throw error;
  }
}

async function main() {
  try {
    logger.info('Initializing middleware and routes');
    configureMiddleware();
    configurePassport();
    configureRoutes();

/*     logger.info('Initializing event processor');
    await initializeEventProcessor(); */

    logger.info('Creating HTTPS server');
    const server = createServer();
    logger.info('Starting server:');
    await startServer(server);

    logger.info('Initializing WebSocket manager');

    const wsManager = new WebSocketManager(server, logger);
    // Attach WebSocket manager to the app.locals or event processor if needed
    app.locals.wsManager = wsManager;
    if (eventProcessor) {
      eventProcessor.setWebSocketManager(wsManager);
    }

    logger.info('Application started successfully');

  } catch (error) {
    logger.error('Application failed to start:', error);
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