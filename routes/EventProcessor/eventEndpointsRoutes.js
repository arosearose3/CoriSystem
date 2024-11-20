import express from 'express';

export function createEventRoutes(eventProcessor, logger) {
  logger.info('Initializing event routes');

  // 1. Initial error checking
  if (!eventProcessor) {
    logger.error('Attempted to create routes with null event processor');
    throw ('Event processor is required');
  }

  if (!eventProcessor.initialized) {
    logger.warn('Creating routes with uninitialized event processor');
  }

  // 2. Router creation - Remove duplicate declaration
  // ISSUE: You had two router declarations, one at the top and one in the function
  const router = express.Router({ mergeParams: true });

  // 3. Logging middleware with more structured information
  router.use((req, res, next) => {
    logger.info('Event route request received', {
      requestInfo: {
        originalUrl: req.originalUrl,
        path: req.path,
        method: req.method
      },
      processorState: {
        initialized: eventProcessor.initialized,
        webhookCount: eventProcessor.webhookEvents.size,
        availableWebhooks: Array.from(eventProcessor.webhookEvents.keys())
      }
    });
    next();
  });

// reject get requests for event endpoints
  router.get('/webhook/:path(*)', (req, res) => {
    logger.warn('GET request received for webhook endpoint:', {
      path: req.params.path
    });
    res.status(405).json({
      error: 'Method not allowed',
      message: 'Webhook endpoints only accept POST requests'
    });
  });

  // 4. Webhook handler with improved error handling and validation
  router.post('/webhook/:path(*)', async (req, res) => {
    const startTime = Date.now();
    const webhookPath = `/webhook/${req.params.path}`;
    const requestId = crypto.randomUUID();  // Add request ID for tracking

    logger.info('Processing webhook', {
      requestId,
      webhook: {
        path: webhookPath,
        method: req.method,
        contentType: req.headers['content-type']
      },
      processor: {
        initialized: eventProcessor.initialized,
        registeredWebhooks: eventProcessor.webhookEvents.size
      }
    });

    try {
      // Validate webhook existence first
      const eventInfo = eventProcessor.webhookEvents.get(webhookPath);
      if (!eventInfo) {
        logger.warn('Unknown webhook path accessed', {
          receivedPath: webhookPath,
          availablePaths: Array.from(eventProcessor.webhookEvents.keys())
        });
        return res.status(404).json({
          error: 'Unknown webhook path',
          received: webhookPath
        });
      }

      // Validate content type
      const contentType = req.headers['content-type'];
      if (!contentType || !eventInfo.endpointInfo.mimeTypes.includes(contentType)) {
        logger.warn('Invalid content type received', {
          received: contentType,
          expected: eventInfo.endpointInfo.mimeTypes
        });
        return res.status(400).json({
          error: 'Invalid content type',
          received: contentType || 'none',
          expected: eventInfo.endpointInfo.mimeTypes
        });
      }

      // Process webhook
      await eventProcessor.handleWebhook(webhookPath, req.body, req.headers);
      
      logger.info('Webhook completed', {
        requestId,
        path: webhookPath,
        processingTimeMs: Date.now() - startTime,
        status: 'success'
      });

      res.status(204).send();

    } catch (error) {
      logger.error('Webhook processing failed', {
        path: webhookPath,
        error: error.message,
        stack: error.stack,
        processingTimeMs: Date.now() - startTime
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 5. Timer handler with improved error handling
  router.post('/timer/push', async (req, res) => {
    const startTime = Date.now();
    
    try {
      if (!req.body || !req.body.message) {
        return res.status(400).json({ error: 'Missing message in request body' });
      }

      await eventProcessor.handleTimerEvent(req.body.message);
      
      logger.info('Timer event processed', {
        processingTimeMs: Date.now() - startTime
      });

      res.status(204).send();

    } catch (error) {
      logger.error('Timer event processing failed', {
        error: error.message,
        stack: error.stack,
        processingTimeMs: Date.now() - startTime
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 6. Enhanced health check endpoint
  router.get('/health', (req, res) => {
    const health = {
      status: eventProcessor.initialized ? 'healthy' : 'initializing',
      timestamp: new Date().toISOString(),
      webhooks: {
        count: eventProcessor.webhookEvents.size,
        paths: Array.from(eventProcessor.webhookEvents.keys())
      },
      processorState: {
        initialized: eventProcessor.initialized
      }
    };

    res.status(200).json(health);
  });

  logger.info('Event routes initialized successfully');
  return router;
}