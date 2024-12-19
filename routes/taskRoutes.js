// Changes: 
// - Removed direct usage of healthcare library methods and replaced them with axios calls
// - Unified all interactions with the FHIR server using Axios and accessToken for authorization
// - The base URL is now constructed once and reused for each endpoint

import express from 'express';
import { auth, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import { getFhirAccessToken } from '../src/lib/auth/auth.js';
import axios from 'axios';

const router = express.Router();

// Construct base FHIR endpoint URL
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;


router.get('/task/execution-count/:planId', async (req, res) => {
  if (!auth) {
      return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
      const { planId } = req.params;
      const accessToken = await getFhirAccessToken();

      // Query FHIR server for completed tasks for this plan
      const response = await axios.get(
          `${FHIR_BASE_URL}/Task?instantiates-canonical=PlanDefinition/${planId}&status=completed`, 
          {
              headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/fhir+json',
              },
          }
      );

      const processedResponse = handleBlobResponse(response.data);
      const count = processedResponse.total || 0;

      res.json({
          planId,
          count,
          timestamp: new Date().toISOString()
      });

  } catch (error) {
      console.error('Error fetching execution count:', error);
      res.status(500).json({ 
          error: `Failed to fetch execution count: ${error.message}` 
      });
  }
});

router.post('/task/execution-counts', async (req, res) => {
  if (!auth) {
      return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
      const { planIds } = req.body;
      
      if (!Array.isArray(planIds)) {
          return res.status(400).json({
              error: 'planIds must be an array'
          });
      }

      const accessToken = await getFhirAccessToken();

      // Get counts for all plans in parallel
      const counts = await Promise.all(
          planIds.map(async (planId) => {
              const response = await axios.get(
                  `${FHIR_BASE_URL}/Task?instantiates-canonical=PlanDefinition/${planId}&status=completed`,
                  {
                      headers: {
                          Authorization: `Bearer ${accessToken}`,
                          'Content-Type': 'application/fhir+json',
                      },
                  }
              );

              const processedResponse = handleBlobResponse(response.data);
              return {
                  planId,
                  count: processedResponse.total || 0
              };
          })
      );

      res.json({
          counts,
          timestamp: new Date().toISOString()
      });

  } catch (error) {
      console.error('Error fetching execution counts:', error);
      res.status(500).json({ 
          error: `Failed to fetch execution counts: ${error.message}` 
      });
  }
});


// Endpoint to add a new Task
router.post('/add', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const taskData = req.body;
    taskData.resourceType = 'Task'; 
    const accessToken = await getFhirAccessToken();

    const response = await axios.post(`${FHIR_BASE_URL}/Task`, taskData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
      },
    });

    const processedResponse = handleBlobResponse(response.data);
    res.status(201).json({ message: `${processedResponse.resourceType} added successfully`, data: processedResponse });
  } catch (error) {
    console.error('Error adding Task:', error);
    res.status(500).json({ error: `Failed to add Task: ${error.message}` });
  }
});

// Endpoint to get all Tasks
router.get('/all', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const accessToken = await getFhirAccessToken();
    const response = await axios.get(`${FHIR_BASE_URL}/Task`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
      },
    });

    const tasks = await handleBlobResponse(response.data);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching Tasks:', error);
    res.status(500).json({ error: 'Failed to fetch Tasks', details: error.message });
  }
});



// Endpoint to update a specific Task by ID
router.post('/update', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id, ...updateData } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Task ID is required for update.' });
  }

  try {
    const accessToken = await getFhirAccessToken();

    // Fetch the existing Task resource
    const readResponse = await axios.get(`${FHIR_BASE_URL}/Task/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
      },
    });
    const existingTask = readResponse.data;

    // Merge existing data with updates
    const updatedTask = { ...existingTask, ...updateData };

    // Update the Task in the FHIR store via PUT
    const updateResponse = await axios.put(`${FHIR_BASE_URL}/Task/${id}`, updatedTask, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
      },
    });

    res.json({ message: 'Task updated successfully', data: updateResponse.data });
  } catch (error) {
    console.error('Error updating Task:', error);
    res.status(500).json({ error: `Failed to update Task: ${error.message}` });
  }
});

// Endpoint to check if a Task can be safely deleted
router.get('/:id/deletion-status', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const accessToken = await getFhirAccessToken();
    const id = req.params.id;

    // Get the task
    const taskResponse = await axios.get(`${FHIR_BASE_URL}/Task/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
      },
    });
    const task = await handleBlobResponse(taskResponse.data);

    // Get child tasks
    const childrenResponse = await axios.get(`${FHIR_BASE_URL}/Task?partOf=Task/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
      },
    });
    const children = await handleBlobResponse(childrenResponse.data);

    res.json({
      taskId: id,
      hasChildren: children.total > 0,
      childCount: children.total,
      status: task.status,
      canDelete: task.status !== 'in-progress'
    });

  } catch (error) {
    console.error('Error checking Task deletion status:', error);
    res.status(500).json({ error: `Failed to check Task deletion status: ${error.message}` });
  }
});

// Endpoint to get active Tasks suitable for activity monitoring
router.get('/active', async (req, res) => {
  console.log ("in task/active")  ;
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const accessToken = await getFhirAccessToken();
    // Search for non-completed Tasks
    const url = `${FHIR_BASE_URL}/Task?status=requested,in-progress,on-hold`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
      },
    });

    const tasksBundle = await handleBlobResponse(response.data);

    // Transform tasks for UI
    const activeTasks = (tasksBundle.entry || []).map(entry => {
      const task = entry.resource;
      return {
        id: task.id,
        title: task.instantiatesCanonical || 'Unknown Activity',
        name: task.businessStatus?.text || task.status,
        kind: task.intent || 'unknown',
        status: task.status,
        executionCount: task.output?.length || 0,
        parentTaskId: task.partOf?.reference
      };
    });

    res.json(activeTasks);

  } catch (error) {
    console.error('Error fetching active Tasks:', error);
    res.status(500).json({ error: 'Failed to fetch active Tasks', details: error.message });
  }
});

// Endpoint to delete a Task
// REPLACE the existing delete endpoint
router.delete('/:id', async (req, res) => {
  if (!auth) {
      return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const force = req.query.force === 'true';
  const cascade = req.query.cascade === 'true';
  const id = req.params.id;

  try {
      const accessToken = await getFhirAccessToken();

      // First get the task and check status
      const taskResponse = await axios.get(`${FHIR_BASE_URL}/Task/${id}`, {
          headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/fhir+json',
          },
      });
      const task = await handleBlobResponse(taskResponse.data);

      if (!force && task.status === 'in-progress') {
          return res.status(400).json({ error: 'Cannot delete active task without force flag' });
      }

      // 1. First find and delete all Provenance records
      const provenanceResponse = await axios.get(`${FHIR_BASE_URL}/Provenance?target=Task/${id}`, {
          headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/fhir+json',
          },
      });
      const provenanceRecords = await handleBlobResponse(provenanceResponse.data);

      for (const entry of provenanceRecords.entry || []) {
          await axios.delete(`${FHIR_BASE_URL}/Provenance/${entry.resource.id}`, {
              headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/fhir+json',
              },
          });
      }

      // 2. If cascading, handle child tasks
      let deletedChildrenCount = 0;
      if (cascade) {
          const childrenResponse = await axios.get(`${FHIR_BASE_URL}/Task?partOf=Task/${id}`, {
              headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/fhir+json',
              },
          });
          const children = await handleBlobResponse(childrenResponse.data);

          if (children.entry) {
              // For each child, delete its Provenance records first
              for (const child of children.entry) {
                  const childId = child.resource.id;
                  
                  // Delete child's Provenance records
                  const childProvenanceResponse = await axios.get(
                      `${FHIR_BASE_URL}/Provenance?target=Task/${childId}`,
                      {
                          headers: {
                              Authorization: `Bearer ${accessToken}`,
                              'Content-Type': 'application/fhir+json',
                          },
                      }
                  );
                  const childProvenanceRecords = await handleBlobResponse(childProvenanceResponse.data);

                  for (const provEntry of childProvenanceRecords.entry || []) {
                      await axios.delete(`${FHIR_BASE_URL}/Provenance/${provEntry.resource.id}`, {
                          headers: {
                              Authorization: `Bearer ${accessToken}`,
                              'Content-Type': 'application/fhir+json',
                          },
                      });
                  }

                  // Then delete the child Task
                  await axios.delete(`${FHIR_BASE_URL}/Task/${childId}`, {
                      headers: {
                          Authorization: `Bearer ${accessToken}`,
                          'Content-Type': 'application/fhir+json',
                      },
                  });
              }
              deletedChildrenCount = children.total || 0;
          }
      }

      // 3. Finally delete the main task
      await axios.delete(`${FHIR_BASE_URL}/Task/${id}`, {
          headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/fhir+json',
          },
      });

      res.json({
          message: 'Task deleted successfully',
          taskId: id,
          deletedChildren: deletedChildrenCount,
          deletedProvenanceRecords: (provenanceRecords.entry || []).length
      });

  } catch (error) {
      console.error('Error deleting Task:', error);
      if (error.response?.status === 409) {
          res.status(409).json({ 
              error: 'Task has remaining references preventing deletion. Try with cascade=true',
              details: error.response.data
          });
      } else {
          res.status(500).json({ error: `Failed to delete Task: ${error.message}` });
      }
  }
});

// Endpoint to get a specific Task by ID
router.get('/:id', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id } = req.params;
 console.log('id',id);

  try {
    const accessToken = await getFhirAccessToken();
    const response = await axios.get(`${FHIR_BASE_URL}/Task/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
      },
    });

    const task = await handleBlobResponse(response.data);
    res.json(task);
  } catch (error) {
    console.error('Error fetching Task:', error);
    res.status(500).json({ error: `Failed to fetch Task: ${error.message}` });
  }
});

export default router;
