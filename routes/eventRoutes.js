//Event Routes handle incoming events
//an event can be a subscription event based on a resource change,
//or a webhook that a user creates and then uses to initiate a workflow
//or a timer (cron type) that initiates a workflow 
//
// 

// eventRoutes.js - Main event handling endpoints
import express from 'express';
import { 
  auth, 
  PROJECT_ID, 
  LOCATION, 
  DATASET_ID, 
  FHIR_STORE_ID, 
  handleBlobResponse 
} from '../serverutils.js';

import { 
  EventManager, 
  createAuditEvent, 
  validateEventSource 
} from './eventProcessor.js';

import { getFhirAccessToken } from '../src/lib/auth/auth.js'; // Adjust the path as needed


const router = express.Router();
const eventManager = new EventManager();

const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

router.post('/receive/timerEvent', async (req, res) => {
  try {
    // The Pub/Sub message is in the request body
    const message = req.body.message;
    
    if (!message || !message.data) {
      console.log('No message data received');
      return res.status(400).json({ error: 'No message data' });
    }

    // Log the raw message for debugging
    console.log('Received Pub/Sub message:', {
      messageId: message.messageId,
      publishTime: message.publishTime,
      data: message.data
    });

    // Decode the base64-encoded data
    const decodedData = Buffer.from(message.data, 'base64').toString();
    let parsedData;
    try {
      parsedData = JSON.parse(decodedData);
      console.log('Decoded json timer  event:', JSON.stringify(parsedData, null, 2));
      }
     catch (parseError) {
      // Not JSON, assume it's a timer event
      console.log('Decoded raw timer event:', decodedData);
    }

    // Create standardized event object
/*     const event = {
      type: 'timer',
      source: 'cloud-scheduler',
      id: message.messageId,
      time: message.publishTime,
      data: timerEvent,
      attributes: message.attributes || {}
    }; */

    // Process the event asynchronously
    // We don't await this because we want to acknowledge quickly
/*     processEvent(event).catch(error => {
      console.error('Error processing timer event:', error, {
        eventId: event.id,
        eventData: event.data
      }); */
      // You might want to send this to a dead letter queue
      // or error monitoring system
    //});

    // Always acknowledge receipt to Pub/Sub
    // This prevents message redelivery
    res.status(200).json({
      message: 'Timer event received and queued for processing'
    });

  } catch (error) {
    console.error('Error handling timer event:', error);
    // Still return 200 to acknowledge the message to Pub/Sub
    // Otherwise, Pub/Sub will retry delivery
    res.status(200).json({ 
      message: 'Error acknowledged',
      error: error.message 
    });
  }
});

// Optional: Separate endpoint for manual testing
router.post('/receive/timerEvent/test', async (req, res) => {
  try {
    // Create a test message in Pub/Sub format
    const testMessage = {
      message: {
        data: Buffer.from(JSON.stringify({
          name: 'test-timer',
          schedule: '*/5 * * * *',
          timestamp: new Date().toISOString()
        })).toString('base64'),
        messageId: 'test-' + Date.now(),
        publishTime: new Date().toISOString(),
        attributes: {
          test: 'true'
        }
      }
    };

    // Send to the main handler
    const response = await axios.post(
      `${process.env.BASE_URL}/api/events/receive/timerEvent`,
      testMessage
    );

    res.json({
      message: 'Test event sent',
      response: response.data
    });

  } catch (error) {
    console.error('Error sending test event:', error);
    res.status(500).json({
      error: 'Failed to send test event',
      details: error.message
    });
  }
});

// Optional: Endpoint to view recent timer events
let recentEvents = []; // In production, use a proper database
const MAX_RECENT_EVENTS = 100;

router.get('/timerEvents/recent', (req, res) => {
  res.json(recentEvents);
});

// Helper function to store recent events
function storeRecentEvent(event) {
  recentEvents.unshift(event);
  if (recentEvents.length > MAX_RECENT_EVENTS) {
    recentEvents = recentEvents.slice(0, MAX_RECENT_EVENTS);
  }
}


/* This is an example of the data that arrives when a Fhir resource is CRUD
 {
  "type": "RESOURCE_TYPE", // e.g., "Patient", "Observation", etc.
  "data": {
    "name": "projects/PROJECT_ID/locations/LOCATION/datasets/DATASET_ID/fhirStores/FHIR_STORE_ID/fhir/RESOURCE_TYPE/RESOURCE_ID",
    "operation": "CREATE", // or "UPDATE", "DELETE"
    "time": "2024-11-07T10:00:00.000Z",
    "resourceType": "RESOURCE_TYPE",
    "resourceId": "RESOURCE_ID"
  }
} */


router.post('/receive/fhirEvent', async (req, res) => {
  console.log ("events/receive/fhirEvent started");
  try {
    // The Pub/Sub message is in req.body.message
  const pubsubMessage = req.body.message;
    
  if (!pubsubMessage || !pubsubMessage.data) {
      console.log('No message data received');
      res.status(400).send('No message data');
      return;
    }

    // Decode the base64-encoded data
  const data = JSON.parse(Buffer.from(pubsubMessage.data, 'base64').toString());
    
 // valid Google FHIR store actions : 
//CreateResource
//PatchResource
//UpdateResource
//DeleteResource

    // The Pub/Sub message attributes contain metadata about the change
    if (pubsubMessage.attributes) {
      console.log('Change metadata:', {
        resourceType: pubsubMessage.attributes.resourceType,
        action: pubsubMessage.attributes.action, // 'CREATE', 'UPDATE', or 'DELETE'
        resourceId: data.id,
        time: pubsubMessage.publishTime
      });
    }
 

    
    console.log ("events/receive/fhirEvent data: ", JSON.stringify(data, null, 2)); 
/*     console.log('Received FHIR change notification:', {
      resourceType: data.type,
      operation: data.data.operation,
      resourceId: data.data.resourceId,
      time: data.data.time
    }); */

    // Example of handling different operations
/*     switch (data.data.operation) {
      case 'CREATE':
        await handleResourceCreation(data);
        break;
      case 'UPDATE':
        await handleResourceUpdate(data);
        break;
      case 'DELETE':
        await handleResourceDeletion(data);
        break;
    } */

    // Always acknowledge the message
    res.status(200).json({ message: 'Notification processed' });

  } catch (error) {
    console.error('Error processing notification:', error);
    // Still return 200 to acknowledge the message
    // (otherwise Pub/Sub will retry)
    res.status(200).json({ 
      message: 'Error processed',
      error: error.message 
    });
  }
});

// Helper functions to handle different operations
async function handleResourceCreation(data) {
  // The full resource name can be used to fetch the resource
  const resourceName = data.data.name;
  
  try {
    // Fetch the new resource if needed
    const accessToken = await getFhirAccessToken();
    const response = await axios.get(
      `${FHIR_BASE_URL}/${data.type}/${data.data.resourceId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json'
        }
      }
    );

    const resource = response.data;
    console.log('New resource created:', {
      type: data.type,
      id: data.data.resourceId,
      resource: resource
    });

    // Add your business logic here
    await processNewResource(resource);

  } catch (error) {
    console.error('Error handling resource creation:', error);
    throw error;
  }
}

async function handleResourceUpdate(data) {
  try {
    // You might want to fetch both old and new versions
    const accessToken = await getFhirAccessToken();
    const response = await axios.get(
      `${FHIR_BASE_URL}/${data.type}/${data.data.resourceId}/_history`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json'
        }
      }
    );

    const versions = response.data.entry;
    const currentVersion = versions[0].resource;
    const previousVersion = versions[1]?.resource;

    console.log('Resource updated:', {
      type: data.type,
      id: data.data.resourceId,
      changes: compareVersions(previousVersion, currentVersion)
    });

    // Add your business logic here
    await processResourceUpdate(currentVersion, previousVersion);

  } catch (error) {
    console.error('Error handling resource update:', error);
    throw error;
  }
}

async function handleResourceDeletion(data) {
  // For deletions, you typically just get the notification
  // The resource is already deleted
  console.log('Resource deleted:', {
    type: data.type,
    id: data.data.resourceId,
    time: data.data.time
  });

  // Add your business logic here
  await processResourceDeletion(data.type, data.data.resourceId);
}

// Helper to compare resource versions
function compareVersions(oldVersion, newVersion) {
  if (!oldVersion) return { type: 'creation', new: newVersion };
  
  const changes = {};
  for (const key in newVersion) {
    if (JSON.stringify(oldVersion[key]) !== JSON.stringify(newVersion[key])) {
      changes[key] = {
        old: oldVersion[key],
        new: newVersion[key]
      };
    }
  }
  return changes;
}




export default router;

