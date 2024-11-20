// routes/testActivityRoutes.js
import express from 'express';
import { createLogger } from './EventProcessor/logger.js';

const router = express.Router();

const logger = createLogger({
 service: 'test-activity-routes',
 level: process.env.LOG_LEVEL || 'debug'
});

// Middleware to log requests
const logRequest = (req, res, next) => {
 logger.debug('Activity endpoint called', {
   path: req.path,
   method: req.method,
   body: req.body
 });
 next();
};

//router.use(logRequest);

// Log activity details and message
router.post('/log-message', (req, res) => {
 try {
   const { planId, executionId, triggerEvent, message } = req.body;
   
/*    logger.info('Test activity executed', {
     activity: 'log-message',
     planId,
     executionId, 
     triggerEvent,
     message
   }); */

   console.log('Activity Message:', message);

   res.json({ 
     status: 'success',
     timestamp: new Date(),
     message: 'Activity logged successfully'
   });

 } catch (error) {
   logger.error('Failed to execute test activity', { error });
   res.status(500).json({ error: error.message });
 }
});

// Log current timestamp
router.post('/log-timestamp', (req, res) => {
 try {
   const now = new Date();
   console.log('Current Timestamp:', now.toISOString());

   logger.info('Timestamp logged', {
     activity: 'log-timestamp',
     timestamp: now
   });

   res.json({
     status: 'success',
     timestamp: now,
     message: 'Timestamp logged successfully'
   });

 } catch (error) {
   logger.error('Failed to log timestamp', { error });
   res.status(500).json({ error: error.message });
 }
});

export default router;