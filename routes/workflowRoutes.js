import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import { getFhirAccessToken } from '../src/lib/auth/auth.js';
import axios from 'axios';
import { BASE_PATH } from '../serverutils.js';
import { fetchPlanDefinitionById } from './planDefinitionService.js';

const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

const router = express.Router();

// New function that creates and returns the router with injected dependencies
export function createWorkflowRoutes(taskManager, planLoader, activityExecutor, eventManager) {
  // Validate that required dependencies are provided
  if (!taskManager || !planLoader || !activityExecutor) {
    throw new Error('Required workflow components are missing');
  }

  const router = express.Router();

  router.get('/task', async (req, res) => {
    try {
      const accessToken = await getFhirAccessToken();
      // Search for all Task resources that reference PlanDefinitions
      const response = await axios.get(
        `${FHIR_BASE_URL}/Task?_include=Task:partOf`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/fhir+json'
          }
      });
  
      const tasks = await handleBlobResponse(response.data);
      res.json(tasks.entry?.map(e => e.resource) || []);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch workflow tasks',
        details: error.message
      });
    }
  });

  // Modify start workflow route to use injected dependencies
  // triggerEvent is passed so that the event that triggered this task is recorded, for debugging, provenance.
  router.post('/start', async (req, res) => {
    try {
      const { planId, triggerEvent } = req.body;

      console.log ("workflow/start req.body: ", req.body);


      if (!planId) {
        return res.status(400).json({ error: 'Plan ID is required' });
      }

    //  if (!triggerEvent || !triggerEvent.resourceType || !triggerEvent.id) {
     if (!triggerEvent ) {
        return res.status(400).json({ error: 'Trigger event information is required' });
      }

      // Use injected planLoader
      const plans = await planLoader.loadPlans([planId]);
      console.log ("workflow/start plans: ", plans);

      if (!plans ) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      const planDefinition = await fetchPlanDefinitionById(planId);
      // Use injected taskManager
      const task = await taskManager.createPlanTask(planDefinition, triggerEvent, {});
      console.log ("workflow/start task: ", task);

      
      console.log ("workflow/start refreshTriggers");
      await eventManager.refreshTriggerMappings();
      
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to start workflow',
        details: error.message
      });
    }
  });

  // Modify stop workflow route to use injected dependencies
  router.post('/:id/stop', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Use injected taskManager
      await taskManager.updateTaskStatus(id, 'cancelled', {
        reason: 'Manually stopped by user'
      });

      res.json({ message: 'Workflow stopped successfully' });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to stop workflow',
        details: error.message
      });
    }
  });

  return router;
}

export default router;
