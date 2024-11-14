// initializeEventProcessor.js
import { EventProcessor } from './eventProcessor2.js';
import { ActivityExecutor } from './activityExecutor.js';
import { createLogger } from './logger.js';
import { 
  auth, 
  PROJECT_ID, 
  LOCATION, 
  DATASET_ID, 
  FHIR_STORE_ID, 
  handleBlobResponse 
} from '../../serverutils.js';
import { getFhirAccessToken } from '../../src/lib/auth/auth.js';
import axios from 'axios';

const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

// FHIR API helper function
async function callFhirApi(method, path, data = null) {
  const accessToken = await getFhirAccessToken();
  const url = `${FHIR_BASE_URL}${path}`;
  
  const config = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/fhir+json'
    }
  };

  if (data) {
    config.headers['Content-Type'] = 'application/fhir+json';
  }

  const response = await axios({ method, url, data, ...config });
  return handleBlobResponse(response.data);
}

export async function initializeEventProcessor() {
  try {
    console.log("Setting up logger...");
    const logger = createLogger({
      service: 'event-processor',
      level: process.env.LOG_LEVEL || 'info'
    });
    console.log("Logger initialized with level:", process.env.LOG_LEVEL || 'info');

    console.log("Initializing activity executor...");
    const activityExecutor = new ActivityExecutor({
      callFhirApi,
      logger
    });
    console.log("Activity executor initialized.");

    console.log("Creating event processor...");
    const eventProcessor = new EventProcessor(callFhirApi, activityExecutor, logger);
    await eventProcessor.initialize();
    console.log("Event processor initialized.");

    //webhook endpoints 
    app.post('/event/webhook/*', async (req, res) => {
      try {
        // Get the full path from the request
        const path = req.path;
        const payload = req.body;
        
        console.log(`Received webhook event for path ${path}:`, payload);

        logger.info('Received webhook event', {
          path,
          contentType: req.headers['content-type']
        });

        await eventProcessor.handleWebhook(path, payload, req.headers);

        console.log("Webhook event processed successfully.");
        res.status(204).send();
      } catch (error) {
        if (error.message.startsWith('Unknown webhook path:')) {
          res.status(404).json({ error: error.message });
        } else {
          console.error("Error processing webhook:", error);
          logger.error('Error processing webhook', error);
          res.status(500).json({ error: error.message });
        }
      }
    });

    // FHIR change endpoint
    console.log("Setting up /fhir-changed endpoint...");
    app.post('/fhir-changed', async (req, res) => {
      try {
        const event = req.body;
        console.log("Received FHIR change event:", event);

        logger.info('Received FHIR change event', {
          resourceType: event.resourceType,
          operation: event.operation,
        });
        await eventProcessor.handleFhirChange(event);

        console.log("FHIR change event processed successfully.");
        res.status(204).send();
      } catch (error) {
        console.error("Error processing FHIR change:", error);
        logger.error('Error processing FHIR change', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Timer push endpoint
    console.log("Setting up /timer/push endpoint...");
    app.post('/timer/push', async (req, res) => {
      try {
        const message = req.body.message;
        console.log("Received Timer message:", message);

        logger.info('Received Timer message', {
          subscription: message.attributes?.subscription,
        });
        await eventProcessor.handleTimerEvent(message);

        console.log("Timer message processed successfully.");
        res.status(204).send();
      } catch (error) {
        console.error("Error processing Timer message:", error);
        logger.error('Error processing Timer message', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Healthcheck endpoint
    console.log("Setting up /health endpoint...");
    app.get('/health', (req, res) => {
      if (!eventProcessor || !eventProcessor.initialized) {
        console.warn("Healthcheck failed: Event processor not initialized.");
        return res.status(503).json({
          status: 'unavailable',
          message: 'Event processor not initialized',
        });
      }

      console.log("Healthcheck passed.");
      res.json({
        status: 'healthy',
        fhirEventTypes: Array.from(eventProcessor.fhirChangeEvents.keys()),
        timerSchedules: Array.from(eventProcessor.timerEvents.keys()),
        registeredEndpoints: Array.from(eventProcessor.endpointMap.entries()).map(([name, info]) => ({
          name,
          path: info.path,
          status: info.status
        })),
        webhookPaths: eventProcessor.getRegisteredWebhookPaths(),
        uptime: process.uptime(),
      });
    });

    return eventProcessor;

  } catch (error) {
    console.error("Failed to initialize event processor:", error);
    throw error;
  }
}