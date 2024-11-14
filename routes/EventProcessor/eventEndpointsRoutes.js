// routes/eventRoutes.js
import express from 'express';
const router = express.Router();

export function createEventRoutes(eventProcessor, logger) {
  router.post('/webhook/*', async (req, res) => {
    try {
      if (!eventProcessor?.initialized) {
        throw new Error('Event processor not initialized');
      }
      
      const path = req.path;
      const payload = req.body;
      
      logger.info('Received webhook event', {
        path,
        contentType: req.headers['content-type']
      });

      await eventProcessor.handleWebhook(path, payload, req.headers);
      res.status(204).send();
    } catch (error) {
      logger.error('Error processing webhook', error);
      res.status(error.message.startsWith('Unknown webhook path:') ? 404 : 500)
         .json({ error: error.message });
    }
  });

  router.post('/fhir-changed', async (req, res) => {
    try {
      if (!eventProcessor?.initialized) {
        throw new Error('Event processor not initialized');
      }

      const event = req.body;
      logger.info('Received FHIR change event', {
        resourceType: event.resourceType,
        operation: event.operation
      });

      await eventProcessor.handleFhirChange(event);
      res.status(204).send();
    } catch (error) {
      logger.error('Error processing FHIR change', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/timer/push', async (req, res) => {
    try {
      if (!eventProcessor?.initialized) {
        throw new Error('Event processor not initialized');
      }

      const message = req.body.message;
      logger.info('Received Timer message', {
        subscription: message.attributes?.subscription
      });

      await eventProcessor.handleTimerEvent(message);
      res.status(204).send();
    } catch (error) {
      logger.error('Error processing Timer message', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/health', (req, res) => {
    if (!eventProcessor?.initialized) {
      return res.status(503).json({
        status: 'unavailable',
        message: 'Event processor not initialized'
      });
    }

    res.json({
      status: 'healthy',
      fhirEventTypes: Array.from(eventProcessor.fhirChangeEvents.keys()),
      timerSchedules: Array.from(eventProcessor.timerEvents.keys()),
      webhookPaths: Array.from(eventProcessor.webhookEvents.keys()),
      uptime: process.uptime()
    });
  });

  return router;
}