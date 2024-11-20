// routes/communicationRoutes.js
import express from 'express';
import { getFhirAccessToken } from '../src/lib/auth/auth.js';
import { PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID } from '../serverutils.js';
import axios from 'axios';
import { createLogger } from './EventProcessor/logger.js';

const router = express.Router();
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

const logger = createLogger({
  service: 'communication-routes',
  level: process.env.LOG_LEVEL || 'debug'
});

// Middleware to check authentication
 const requireAuth = (req, res, next) => {
/*   if (!req.session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  } */
  next();
};
 
// Helper function to make FHIR API calls
async function callFhirApi_comms(method, pathstring, data = null, params = null) {
  console.log ("callFhirApi:", method, pathstring, data, params);

  try {
    const accessToken = await getFhirAccessToken();
    const url = `${FHIR_BASE_URL}/${pathstring}`;
    
    const config = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json'
      }
    };

    if (params) {
      config.params = params;
    }

    if (data) {
      config.data = data;
    }

    console.log ("callFhir  config :", JSON.stringify(config));

    const response = await axios(config);
    return response.data;
  } catch (error) {
    logger.error('FHIR API call failed', { 
      method, 
      path, 
      error: error.response?.data || error.message 
    });
    throw error;
  }
}


router.get('/allcomms', requireAuth, async (req, res) => {
  console.log ('in comm/all ');
  try {
    // Fetch all Communication resources

    try {
      const accessToken = await getFhirAccessToken();
 //     const url = `${FHIR_BASE_URL}/Communication?_sort=-sent`;
      const url = `${FHIR_BASE_URL}/Communication`;

      console.log("communication/all url:", url);
      // Configuration for the GET request
      const config = {
        method: 'GET',
        url,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/fhir+json',
          Accept: 'application/fhir+json',
        },
    //    ...(params && { params }), // Add params only if they exist
      };
    
      console.log("comm/all config:", JSON.stringify(config));
    
      const response = await axios(config);
    
      // Log the number of resources retrieved
      logger.info(`Fetched ${response.data.total || 0} communications`);
    
      // Return the resources
      res.json(response.data);
    } catch (error) {
      logger.error('Failed to fetch communications', error);
      res.status(500).json({ 
        error: 'Failed to fetch communications',
        details: error.message,
      });
    }

  } catch (error) {
    logger.error('Failed to fetch all communications', error);
    res.status(500).json({ 
      error: 'Failed to fetch all communications',
      details: error.message 
    });
  }
});


// POST /api/communication
// Create a new communication
router.post('/', requireAuth, async (req, res) => {
  try {
  //  const userId = req.session.user.id;
    const communication = {
      resourceType: 'Communication',
      status: 'completed',
      sent: new Date().toISOString(),
      ...req.body,
      sender: {
        reference: `${req.body.sender?.reference || `Practitioner/${userId}`}`
      }
    };

    console.log ("communicationRoute-POST :", JSON.stringify(communication));
    // Validate required fields
    if (!communication.recipient?.[0]?.reference) {
      return res.status(400).json({ error: 'Recipient is required' });
    }

    if (!communication.payload?.[0]?.contentString) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const result = await callFhirApi_comms('POST', 'Communication', communication);

    // If WebSocket server is available, notify recipient
    if (req.app.locals.wsManager) {
      const recipientId = communication.recipient[0].reference.split('/')[1];
      req.app.locals.wsManager.notifySubscribers('Communication', {
        type: 'newMessage',
        recipientId,
        message: result
      });
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error('Failed to create communication', error);
    res.status(500).json({ 
      error: 'Failed to create communication',
      details: error.message 
    });
  }
});

// GET /api/communication/:id
// Get a specific communication
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await callFhirApi_comms('GET', `Communication/${req.params.id}`);

    // Check if user has permission to view this communication
    const userId = req.session.user.id;
    const isRecipient = result.recipient?.some(r => 
      r.reference === `Patient/${userId}` || r.reference === `Practitioner/${userId}`
    );
    const isSender = result.sender?.reference === `Practitioner/${userId}`;

    if (!isRecipient && !isSender) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(result);
  } catch (error) {
    logger.error('Failed to fetch communication', error);
    res.status(500).json({ 
      error: 'Failed to fetch communication',
      details: error.message 
    });
  }
});

// PATCH /api/communication/:id
// Update a communication (e.g., mark as read)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    // First, get the current communication
    const current = await callFhirApi_comms('GET', `Communication/${req.params.id}`);
    
    // Check if user is the recipient
    const userId = req.session.user.id;
    const isRecipient = current.recipient?.some(r => 
      r.reference === `Patient/${userId}` || r.reference === `Practitioner/${userId}`
    );

    if (!isRecipient) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Create updated communication
    const updated = {
      ...current,
      ...req.body,
      id: req.params.id
    };

    // Update the communication
    const result = await callFhirApi_comms(
      'PUT', 
      `Communication/${req.params.id}`, 
      updated
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to update communication', error);
    res.status(500).json({ 
      error: 'Failed to update communication',
      details: error.message 
    });
  }
});

// DELETE /api/communication/:id
// Delete a communication
router.delete('/delete/:id', requireAuth, async (req, res) => {
  try {
    // First, get the current communication
    const current = await callFhirApi_comms('GET', `Communication/${req.params.id}`);
    
    // Check if user is the sender
 //   const userId = req.session.user.id;
 //   const isSender = current.sender?.reference === `Practitioner/${userId}`;

/*     if (!isSender) {
      return res.status(403).json({ error: 'Forbidden' });
    } */

    await callFhirApi_comms('DELETE', `Communication/${req.params.id}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete communication', error);
    res.status(500).json({ 
      error: 'Failed to delete communication',
      details: error.message 
    });
  }
});

// GET /api/communication/unread/count
// Get count of unread messages for current user
router.get('/unread/count', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const params = new URLSearchParams({
      recipient: userId,
      'received:missing': 'true',
      _summary: 'count'
    });

    const response = await callFhirApi_comms(
      'GET',
      `Communication?${params.toString()}`
    );

    res.json({ count: response.total });
  } catch (error) {
    logger.error('Failed to fetch unread count', error);
    res.status(500).json({ 
      error: 'Failed to fetch unread count',
      details: error.message 
    });
  }
});


// GET /api/communication
// Fetch communications for the current user
router.get('/', requireAuth, async (req, res) => {
  console.log ("communicationRoute-GET query:", JSON.stringify(req.query));
  console.log ("communicationRoute-GET session:", JSON.stringify(req.session));
  try {
   // const userId = req.session.user.id;
    const params = new URLSearchParams();

    console.log ("communicationRoute-GET query:", JSON.stringify(req.query));
    console.log ("communicationRoute-GET session:", JSON.stringify(req.session));

    // Base search parameters
    params.append('_sort', '-sent');
    
    // Add recipient filter
    if (req.query.recipient) {
      params.append('recipient', req.query.recipient);
    } else {
      // Default to current user if no recipient specified
      params.append('recipient', userId);
    }

    // Add any additional query parameters
    if (req.query.status) {
      params.append('status', req.query.status);
    }

    if (req.query._count) {
      params.append('_count', req.query._count);
    }

    const response = await callFhirApi_comms(
      'GET', 
      `Communication?${params.toString()}`
    );

    res.json(response);
  } catch (error) {
    logger.error('Failed to fetch communications', error);
    res.status(500).json({ 
      error: 'Failed to fetch communications',
      details: error.message 
    });
  }
});
export default router;