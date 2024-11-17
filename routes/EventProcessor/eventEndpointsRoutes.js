// routes/eventRoutes.js
import express from 'express';
const router = express.Router({ mergeParams: true });


export function createEventRoutes(eventProcessor, logger) {
  if (!eventProcessor) {
    logger.error('Attempted to create routes with null event processor');
    throw new Error('Event processor is required');
  }

  const router = express.Router({ mergeParams: true });

  router.use((req, res, next) => {
    logger.info('Event route request', {
      originalUrl: req.originalUrl,
      basePath: BASE_PATH,
      path: req.path,
      method: req.method,
      // List actual registered paths instead of using wildcard
    //  registeredWebhookPaths: Array.from(eventProcessor.webhookEvents.keys())
    });
    next();
  });

 

  // Webhook handler with full error handling and path normalization
  router.post('/webhook/:path(*)', async (req, res) => {
    try {
      const webhookPath = `/webhook/${req.params.path}`;
      
      logger.info('Processing webhook', {
        webhookPath,
        registeredWebhooks: Array.from(eventProcessor.webhookEvents.keys())
      });

      // Check if webhook exists
      const eventInfo = eventProcessor.webhookEvents.get(webhookPath);
      if (!eventInfo) {
        return res.status(404).json({
          error: 'Unknown webhook path',
          received: webhookPath,
          available: Array.from(eventProcessor.webhookEvents.keys())
        });
      }

      // Validate content type
      const contentType = req.headers['content-type'];
      if (!contentType || !eventInfo.endpointInfo.mimeTypes.includes(contentType)) {
        return res.status(400).json({
          error: 'Invalid or missing content-type',
          received: contentType || 'none',
          expected: eventInfo.endpointInfo.mimeTypes
        });
      }

      // Process webhook
      await eventProcessor.handleWebhook(webhookPath, req.body, req.headers);
      res.status(204).send();

    } catch (error) {
      logger.error('Webhook processing failed', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ error: error.message });
    }
  });


  // Timer events
  router.post('/timer/push', async (req, res) => {
    try {
      await eventProcessor.handleTimerEvent(req.body.message);
      res.status(204).send();
    } catch (error) {
      logger.error('Error processing Timer message', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      webhooks: Array.from(eventProcessor.webhookEvents.keys()),
      initialized: eventProcessor.initialized
    });
  });

  return router;
}
