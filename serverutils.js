import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';

// services/routeServices.js
import fetch from 'node-fetch';
import { OAuth2Client } from 'google-auth-library';
import passport from 'passport';

dotenv.config(); // Load environment variables from .env file

export const PROJECT_ID = process.env.PROJECT_ID;
export const LOCATION = process.env.LOCATION;
export const DATASET_ID = process.env.DATASET_ID;
export const FHIR_STORE_ID = process.env.FHIR_STORE_ID;

export const healthcare = google.healthcare('v1');

// Base path based on environment
export const BASE_PATH = process.env.BASE_PATH;
export const CLIENT_URL = process.env.CLIENT_URL;



// Initialize GoogleAuth with correct scopes
export const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

// Function to connect to Google Cloud (for testing purposes)
export const connectToGoogleCloud = async () => {
  try {
    const authClient = await auth.getClient(); // Obtain the authenticated client
    // Test request to validate connection to Google Cloud
    await authClient.request({ url: 'https://www.googleapis.com/auth/cloud-platform' });
    console.log('Connected to Google Cloud successfully');
    return { success: true, message: 'Connected to Google Cloud' };
  } catch (error) {
    console.error('Error connecting to Google Cloud:', error.message);
    return { success: false, error: error.message };
  }
};

// Function to get the OAuth2 access token
export const getAccessToken = async () => {
  try {
    console.log('Attempting to obtain Google Cloud access token...');
    const authClient = await auth.getClient(); // Ensure the client is correctly set up

    // Check the type of the client to verify it's configured correctly
    if (!authClient) {
      throw new Error('Authentication client is not initialized.');
    }

    const tokenResponse = await authClient.getAccessToken();
    if (!tokenResponse || !tokenResponse.token) {
      throw new Error('Access token is missing from the response.');
    }

    console.log('Access token retrieved successfully:', tokenResponse.token);
    return tokenResponse.token;
  } catch (error) {
    console.error('Error obtaining Google Cloud access token:', error.message);
    throw new Error('Failed to get Google Cloud access token');
  }
};

// Function to redirect user to Google OAuth URL
export const getGoogleAuthUrl = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${BASE_PATH}/auth/google/callback` // The callback URL
  );

  // Generate the Google OAuth2 URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
  });

  return authUrl;
};

// Function to handle blob responses (for some APIs that return blob)
export const handleBlobResponse = async (responseData) => {
  if (responseData && responseData[Symbol.toStringTag] === 'Blob') {
    const buffer = await responseData.arrayBuffer();
    return JSON.parse(Buffer.from(buffer).toString('utf-8'));
  } else if (typeof responseData === 'object' && responseData !== null) {
    return responseData;
  } else {
    throw new Error('Unexpected response type');
  }
};




export class RouteServices {
  constructor(logger, BASE_PATH, oauth2Client) {
    this.logger = logger;
    this.BASE_PATH = BASE_PATH;
    this.oauth2Client = oauth2Client;
  }

  // Authentication Services
  async verifyGoogleToken(token) {
    const url = `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`;
    const response = await fetch(url);
    return response.ok;
  }

  async verifyFacebookToken(token) {
    const url = `https://graph.facebook.com/me?access_token=${token}`;
    const response = await fetch(url);
    this.logger.debug('Facebook token verification response:', response);
    return response.ok;
  }

  async handleGoogleCallback(code, req) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    const userInfo = await this.oauth2Client.request({
      url: 'https://www.googleapis.com/oauth2/v3/userinfo'
    });

    const user = {
      id: userInfo.data.sub,
      email: userInfo.data.email,
      name: userInfo.data.name,
      picture: userInfo.data.picture,
    };

    req.session.user = user;
    req.session.googleToken = tokens.access_token;

    return user;
  }

  async handleLogout(req) {
    const tasks = [];

    if (req.session.googleToken) {
      tasks.push(this.revokeGoogleToken(req.session.googleToken));
    }

    if (req.session.fbToken) {
      tasks.push(this.revokeFacebookToken(req.session.fbToken));
    }

    await Promise.all(tasks);
    return new Promise((resolve, reject) => {
      req.session.destroy(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async revokeGoogleToken(token) {
    const url = `https://oauth2.googleapis.com/revoke?token=${token}`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      throw new Error('Failed to revoke Google token');
    }
  }

  async revokeFacebookToken(token) {
    const url = `https://graph.facebook.com/me/permissions?access_token=${token}`;
    await fetch(url, { method: 'DELETE' });
  }

  // SMS Services
  async sendSMS(phoneNumber, message, twilioClient) {
    if (!message || !phoneNumber) {
      throw new Error('Message and phone number are required');
    }

    return await twilioClient.messages.create({
      body: message,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      to: phoneNumber
    });
  }

  // Middleware Functions
  logEventRequest(req, res, next) {
    this.logger.info('Event route accessed', {
      request: {
        url: req.originalUrl,
        path: req.path,
        method: req.method
      },
      routing: {
        basePath: this.BASE_PATH
      }
    });
    next();
  }

  shouldLogPath(path) {
    const excludePaths = [
      '_app/immutable',
      '_app/version.json',
      'favicon.ico',
      'robots.txt',
      '.js',
      '.css',
      '.map'
    ];
    
    return !excludePaths.some(excludePath => path.includes(excludePath));
  }
  
  logRequest(req, res, next) {
    // Skip logging for immutable app paths
/*     if (!req.path.includes('_app/immutable')) {
      this.logger.info('Raw request:', {
        path: req.path,
        method: req.method
      }); 
    }*/
    if (this.shouldLogPath(req.path)) {
      this.logger.debug('Request received', {  // Changed to debug level
        path: req.path,
        method: req.method
      });
    }
    next();
  }

  handleError(err, req, res, next) {
    this.logger.error('Express error:', err);
    next(err);
  }

  // Route Setup Helpers
  setupAuthRoutes(app) {
    app.get(`${this.BASE_PATH}/auth/google/url`, (req, res) => {
      const redirectUri = `${process.env.CLIENT_URL}${this.BASE_PATH}/auth/google/callback`;
      const url = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
        redirect_uri: redirectUri,
      });
      res.redirect(url);
    });

    app.get(`${this.BASE_PATH}/auth/google/callback`, async (req, res) => {
      try {
        await this.handleGoogleCallback(req.query.code, req);
        res.redirect(`${process.env.CLIENT_URL}${this.BASE_PATH}/`);
      } catch (error) {
        this.logger.error('Google authentication error:', error);
        res.status(500).send('Authentication failed');
      }
    });

    app.get(`${this.BASE_PATH}/auth/facebook/url`, 
      passport.authenticate('facebook', { scope: ['email'] }));

    app.get(`${this.BASE_PATH}/auth/facebook/callback`,
      passport.authenticate('facebook', { failureRedirect: '/' }),
      (req, res) => {
        res.redirect(`${process.env.CLIENT_URL}${this.BASE_PATH}`);
      });

    // User auth status endpoint
    app.get(`${this.BASE_PATH}/auth/user`, async (req, res) => {
      const googleToken = req.session.googleToken;
      const facebookToken = req.user?.fbToken;
      
      try {
        const isGoogleValid = googleToken ? await this.verifyGoogleToken(googleToken) : false;
        const isFacebookValid = facebookToken ? await this.verifyFacebookToken(facebookToken) : false;

        if (!isGoogleValid && !isFacebookValid) {
          return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = isGoogleValid ? req.session.user : req.user;
        res.json({ user });
      } catch (error) {
        this.logger.error('Token verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Logout endpoint
    app.post(`${this.BASE_PATH}/auth/logout`, async (req, res) => {
      try {
        await this.handleLogout(req);
        res.clearCookie('connect.sid');
        res.json({ success: true });
      } catch (error) {
        this.logger.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
      }
    });
  }

  setupAPIRoutes(app, routes) {
    Object.entries(routes).forEach(([path, router]) => {
      app.use(`${this.BASE_PATH}/api/${path}`, router);
    });
  }
}