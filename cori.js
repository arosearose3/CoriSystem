// server.js
import express from 'express';
import session from 'express-session';
import { OAuth2Client } from 'google-auth-library';
import { handler } from './build/handler.js'; // Import the SvelteKit handler
// import http from 'http';
import https from 'https';
import fs from 'fs'; 
import { createServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';

import { ActivityExecutor } from './routes/EventProcessor/activityExecutor.js';
import { EventProcessor } from './routes/EventProcessor/eventProcessor2.js';
import { createLogger } from './routes/EventProcessor/logger.js';

import { createEventRoutes } from './routes/EventProcessor/eventEndpointsRoutes.js';


import api211Routes from './routes/api211Routes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import conditionRoutes from './routes/conditionRoutes.js';
import communicationRoutes from './routes/communicationRoutes.js';
import consentRoutes from './routes/consentRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import exclusionRoutes from './routes/exclusionRoutes.js';
import fileuploadRoutes from './routes/fileuploadRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import practitionerRoutes from './routes/practitionerRoutes.js';
import provenanceRoutes from './routes/provenanceRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import serverstatsRoutes from './routes/serverstatsRoutes.js';
import serviceRequestRoutes from './routes/serviceRequestRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
//import subscriptionRoutes from './routes/subscriptionRoutes.js';

import activityDefinitionRoutes from './routes/activityDefinitionRoutes.js';
import planDefinitionRoutes from './routes/planDefinitionRoutes.js';
import timerRoutes from './routes/timerRoutes.js';

import templateActivityRoutes from './routes/templateActivityRoutes.js'; 
import templateEventRoutes from './routes/templateEventRoutes.js'; 
import templatePlanRoutes from './routes/templatePlanRoutes.js'; 

import endpointRoutes from './routes/endpointRoutes.js'; 


import { WebSocketManager } from './serverutils/webSocketServer.js';


import { getFhirAccessToken} from './src/lib/auth/auth.js';
import { auth, healthcare, BASE_PATH,PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from './serverutils.js';

import axios from 'axios';

dotenv.config(); // Load environment variables

const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;


const app = express();
let eventProcessor = null; // Declare at module level

const logger = createLogger({
  service: 'cori-server',
  level: process.env.LOG_LEVEL || 'debug'
});

// callFhirApi is used in the ActivityExecutor
// path coming in needs to be a FHIR path, not a coripath. 
async function callFhirApi(method, path, data = null) {
  const accessToken = await getFhirAccessToken();
  const url = path.startsWith('/') ? `${FHIR_BASE_URL}${path}` : `${FHIR_BASE_URL}/${path}`;
  
  const config = {
    method,
    url,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/fhir+json'
    }
  };

  // Add data and Content-Type for POST, PUT, PATCH
  if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && data) {
    config.data = data;
    config.headers['Content-Type'] = 'application/fhir+json';
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    logger.error('FHIR API call failed', { method, path, error });
    throw error;
  }
}

const activityExecutor = new ActivityExecutor({
  callFhirApi,
  logger
});





// Setup Google OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.CLIENT_URL}${BASE_PATH}/auth/google/callback`
  
);

app.use(cors({
  origin: process.env.CLIENT_URL, // Ensure this matches your client URL
  credentials: true
}));

app.use(express.json());
app.use(express.static('public'));


  app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  next(err);
});


app.use((req, res, next) => {
  logger.info('Raw request:', {
  //  originalUrl: req.originalUrl,
  //  basePath: BASE_PATH,
    // Remove the hardcoded wildcard path
    // fullPath: `${BASE_PATH}/events/webhook/*`,
    // Instead, log actual request details:
    path: req.path,
    method: req.method,
  //  registeredWebhooks: eventProcessor?.webhookEvents ? 
  //    Array.from(eventProcessor.webhookEvents.keys()) : []
  });
  next();
});

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Serialize user
passport.serializeUser((user, done) => {
//  console.log('Serializing user:', user);
  done(null, user);
});

passport.deserializeUser((user, done) => {
 // console.log('Deserializing user:', user);
  done(null, user);
});

passport.use(new FacebookStrategy({
  clientID: process.env.FB_APP_ID,
  clientSecret: process.env.FB_APP_SECRET,
  callbackURL: `${process.env.CLIENT_URL}${BASE_PATH}/auth/facebook/callback`,
  profileFields: ['id', 'displayName', 'email', 'photos'],
  passReqToCallback: true
}, (req, accessToken, refreshToken, profile, done) => {
  const user = {
    id: profile.id,
    email: profile.emails && profile.emails[0].value,
    name: profile.displayName,
    picture: profile.photos && profile.photos[0].value || null,
    fbToken: accessToken
  };
  console.log('Session ID in Strategy:', req.sessionID);
  return done(null, user);
}));




// Route to start OAuth2 process
app.get(`${BASE_PATH}/auth/facebook/url`, passport.authenticate('facebook', { scope: ['email'] }));


app.get(`${BASE_PATH}/auth/facebook/callback`,
  passport.authenticate('facebook', { failureRedirect: '/', failureMessage: true }),
  (req, res) => {
    console.log('Session ID in /auth/facebook/callback:', req.sessionID);
    res.redirect(`${process.env.CLIENT_URL}${BASE_PATH}`);
  }
);


app.post(`${BASE_PATH}/api/send-sms`, async (req, res) => {
  const { message, phoneNumber } = req.body;

  if (!message || !phoneNumber) {
    return res.status(400).json({ error: 'Message and phone number are required' });
  }

  try {
    const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const result = await client.messages.create({
      body: message,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      to: phoneNumber
    });
    res.status(200).json({ sid: result.sid });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Google OAuth Routes
app.get(`${BASE_PATH}/auth/google/url`, (req, res) => {
  const redirectUri = `${process.env.CLIENT_URL}${BASE_PATH}/auth/google/callback`; // Ensure this matches your environment
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    redirect_uri: redirectUri,
  });

  console.log('Generated Google Auth URL:', url); // Debugging log
  console.log('redirect URi:', redirectUri); // Debugging log
  res.redirect(url); 
});

app.get(`${BASE_PATH}/auth/google/callback`, async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const userInfo = await oauth2Client.request({
      url: 'https://www.googleapis.com/oauth2/v3/userinfo'
    });
    // Store user information in session
    req.session.user = {
      id: userInfo.data.sub,
      email: userInfo.data.email,
      name: userInfo.data.name,
      picture: userInfo.data.picture,
    };

    req.session.googleToken = tokens.access_token;
    console.log('User authenticated:', req.session.user); //client will get the user data
    // Server-side
    let u = `${process.env.CLIENT_URL}${BASE_PATH}/`;
    res.redirect(u); // No userData in URL

  } catch (error) {
    console.error('Error during Google authentication:', error);
    res.status(500).send('Authentication failed');
  }
});

  // Function to verify Google token
  async function verifyGoogleToken(token)  {
    const url = `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`;
    const response = await fetch(url);
    return response.ok;
  };

  // Function to verify Facebook token
  async function verifyFacebookToken (token)  {
    const url = `https://graph.facebook.com/me?access_token=${token}`;
    const response = await fetch(url);
    console.log ("verify FBtoken response:", JSON.stringify(response));
    return response.ok;
  };

  app.get(`${BASE_PATH}/auth/user`, async (req, res) => {
    console.log("Session ID in /auth/user:", req.sessionID);
    console.log("req.user:", req.user);
    console.log("req.session.passport:", req.session.passport);
  
    // Extract tokens
    const googleToken = req.session.googleToken;
    const facebookToken = req.user && req.user.fbToken;
  
    try {
      let isTokenValid = false;
      let user = null;
  
      if (googleToken) {
        isTokenValid = await verifyGoogleToken(googleToken);
        if (!isTokenValid) {
          req.session.user = null;
          req.session.googleToken = null;
          return res.status(401).json({ error: 'Not authenticated' });
        }
        user = req.session.user;
      }
  
      if (facebookToken) {
        isTokenValid = await verifyFacebookToken(facebookToken);
        if (!isTokenValid) {
          console.log('Facebook token is invalid, clearing user session.');
          if (req.session.passport) {
            req.session.passport.user = null;
          }
          return res.status(401).json({ error: 'Not authenticated' });
        }
        user = req.user;
      }
  
      if (isTokenValid && user) {
        return res.json({ user });
      } else {
        req.session.user = null;
        if (req.session.passport) {
          req.session.passport.user = null;
        }
        return res.status(401).json({ error: 'Not authenticated' });
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      req.session.user = null;
      if (req.session.passport) {
        req.session.passport.user = null;
      }
      req.session.googleToken = null;
      return res.status(500).json({ error: 'Internal server error' });
    }
  });



  app.post(`${BASE_PATH}/auth/logout`, async (req, res) => {
    if (!req.session) {
      return res.status(400).json({ error: 'No active session found' });
    }
  
    try {
      // Revoke the Google token if it exists
      const googleToken = req.session.googleToken;
      if (googleToken) {
        const url = `https://oauth2.googleapis.com/revoke?token=${googleToken}`;
        const response = await fetch(url, { method: 'POST' });
        if (!response.ok) {
          throw new Error('Failed to revoke Google token');
        }
        req.session.googleToken = null; // Clear Google token after revocation
      }
  
      // Revoke the Facebook token if it exists
      const facebookToken = req.session.fbToken;
      if (facebookToken) {
        const url = `https://graph.facebook.com/me/permissions?access_token=${facebookToken}`;
        await fetch(url, { method: 'DELETE' });
        req.session.fbToken = null; // Clear Facebook token after revocation
      }
  
      // Destroy the session after token revocation
      req.session.destroy(err => {
        if (err) {
          return res.status(500).json({ error: 'Could not log out' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
      });
    } catch (err) {
      console.error('Error during logout:', err);
      res.status(500).json({ error: 'Logout failed' });
    }
  });
  


app.use(`${BASE_PATH}/api/api211`, api211Routes);
app.use(`${BASE_PATH}/api/availability`, availabilityRoutes);
app.use(`${BASE_PATH}/api/condition`, conditionRoutes);
app.use(`${BASE_PATH}/api/consent`, consentRoutes);
app.use(`${BASE_PATH}/api/email`, emailRoutes);
app.use(`${BASE_PATH}/api/exclusion`, exclusionRoutes);
app.use(`${BASE_PATH}/api/fileupload`, fileuploadRoutes);
app.use(`${BASE_PATH}/api/goal`, goalRoutes);
app.use(`${BASE_PATH}/api/organization`, organizationRoutes);
app.use(`${BASE_PATH}/api/patient`, patientRoutes);
app.use(`${BASE_PATH}/api/practitioner`, practitionerRoutes);
app.use(`${BASE_PATH}/api/provenance`, provenanceRoutes);
app.use(`${BASE_PATH}/api/role`, roleRoutes);
app.use(`${BASE_PATH}/api/serverstats`, serverstatsRoutes);
app.use(`${BASE_PATH}/api/servicerequest`, serviceRequestRoutes);
app.use(`${BASE_PATH}/api/task`, taskRoutes);
app.use(`${BASE_PATH}/api/activityDefinition`, activityDefinitionRoutes);
app.use(`${BASE_PATH}/api/planDefinition`, planDefinitionRoutes);
//app.use(`${BASE_PATH}/api/subscription`, subscriptionRoutes);
app.use(`${BASE_PATH}/api/timer`, timerRoutes);
app.use(`${BASE_PATH}/api/templates/activities`, templateActivityRoutes);
app.use(`${BASE_PATH}/api/templates/events`, templateEventRoutes);
app.use(`${BASE_PATH}/api/templates/plans`, templatePlanRoutes);

app.use(`${BASE_PATH}/api/webhook`, endpointRoutes);
app.use(`${BASE_PATH}/api/communication`, communicationRoutes);



app.post(`${BASE_PATH}/`, (req, res) => {
  console.log('responding with 200 to $BASE_PATH/', req.body);
  res.status(200).send();
});




app.post("/", (req, res) => {
  console.log('responding with 200 to post./ ', req.body);
  res.status(200).send();
});

// Handle all other requests with the SvelteKit handler
app.use((req, res, next) => {
  handler(req, res, next);
});




async function initializeEventProcessing() {
  try {
    logger.info('Starting event processor initialization');
    
    eventProcessor = new EventProcessor(callFhirApi, activityExecutor, logger);
    logger.info('Event processor instance created');
    
    await eventProcessor.initialize();
    logger.info('Event processor initialized ', {
      webhookEvents: eventProcessor.webhookEvents.size,
   //   registeredPaths: Array.from(eventProcessor.webhookEvents.keys())
    });

    const httpsOptions = {
      key: fs.readFileSync('./certs/localhost-key.pem'),
      cert: fs.readFileSync('./certs/localhost.pem')
    };
    
    const PORT = process.env.SERVER_PORT || 3001;
    logger.info(`Creating HTTPS server on port ${PORT}`);
    
    const server = https.createServer(httpsOptions, app);
    
    // Initialize WebSocket manager
    logger.info('Initializing WebSocket manager');
    const wsManager = new WebSocketManager(server, logger);
    app.locals.wsManager = wsManager;
    
    // Configure event processor with WebSocket manager
    logger.info('Configuring WebSocket manager for event processor');
    eventProcessor.setWebSocketManager(wsManager);

    logger.info('Webhook registrations:', {
      paths: Array.from(eventProcessor.webhookEvents.keys()),
      details: Array.from(eventProcessor.webhookEvents.entries()).map(([path, info]) => ({
        path,
        name: info.endpointInfo.name,
        mimeTypes: info.endpointInfo.mimeTypes
      }))
    });

    return server;
  } catch (error) {
    logger.error('Failed to initialize event processor:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

async function startServer() {
  try {
    logger.info('Starting server initialization');
    
    // 1. Initialize activity executor
    logger.info('Initializing activity executor');
    await activityExecutor.initialize();
    logger.info('Activity executor initialized successfully');
    
    // 2. Initialize event processing
    const server = await initializeEventProcessing();
    
    // 3. Verify initialization
    if (!eventProcessor?.initialized) {
      throw new Error('Event processor initialization failed');
    }

    // 4. Set up event routes AFTER eventProcessor is initialized
    logger.info('Setting up event routes with initialized processor');

    app.use(`${BASE_PATH}/events`, (req, res, next) => {
      logger.info('Events middleware hit:', {
        originalUrl: req.originalUrl,
        basePath: BASE_PATH,
        path: req.path,
        method: req.method,
        registeredWebhooks: eventProcessor?.webhookEvents ? 
          Array.from(eventProcessor.webhookEvents.keys()) : []
      });
      next();
    }, createEventRoutes(eventProcessor, logger));
    
    // Start server
    const PORT = process.env.SERVER_PORT || 3001;
    await new Promise((resolve, reject) => {
      server.listen(PORT, (err) => {
        if (err) {
          logger.error('Server listen error:', err);
          reject(err);
        } else {
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

    return server; // Return server instance
  } catch (error) {
    logger.error('Unhandled error during server startup:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

    // Setup orderly shutdown handler
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, initiating shutdown');
      try {
        if (eventProcessor) {
          // Get active executions
          const activeExecutions = eventProcessor.activityExecutor.getActiveExecutions();
          logger.info(`Cleaning up ${activeExecutions.length} active executions`);
          
          // Cleanup activity executor
          await eventProcessor.activityExecutor.cleanup();
          
          // Close WebSocket connections
          if (eventProcessor.wsManager) {
            const clientCount = eventProcessor.wsManager.wss.clients.size;
            logger.info(`Closing ${clientCount} WebSocket connections`);
            eventProcessor.wsManager.wss.clients.forEach(client => {
              client.close(1000, 'Server shutting down');
            });
          }
        }
    
        // Close server
        if (server) {
          await new Promise((resolve, reject) => {
            server.close((err) => {
              if (err) {
                logger.error('Error closing server:', err);
                reject(err);
              } else {
                logger.info('Server closed successfully');
                resolve();
              }
            });
          });
        }
    
      } catch (error) {
        logger.error('Error during cleanup:', {
          error: error.message,
          stack: error.stack
        });
      } finally {
        logger.info('Shutdown complete');
        process.exit(0);
      }
    });
    
    process.on('SIGINT', () => {
      logger.info('SIGINT received');
      process.emit('SIGTERM');
    });

// Make sure to export the eventProcessor if needed
// Export eventProcessor
export { eventProcessor };

// Start the server
let server;
startServer()
  .then(s => {
    server = s;
  })
  .catch(error => {
    logger.error('Unhandled error during server startup:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });

  