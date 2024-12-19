import express from 'express';

export function createEventRoutes(eventListener, logger) {
    const router = express.Router();

    // Basic route for health check
    router.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });

    // Response handling endpoints
    router.get('/response/:requestId/:choice', async (req, res) => {
        logger.debug('Response endpoint called', {
            requestId: req.params.requestId,
            choice: req.params.choice
        });
        res.status(200).send('Response recorded');
    });

    // Generic webhook endpoint
    router.post('/webhook/:id', async (req, res) => {
        logger.debug('Webhook endpoint called', {
            id: req.params.id,
            body: req.body
        });
        res.status(200).send('Webhook received');
    });

    return router;
}