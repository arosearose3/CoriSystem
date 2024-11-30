
import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary
import { getFhirAccessToken } from '../src/lib/auth/auth.js';
import axios from 'axios';



const router = express.Router();

// Endpoint to add a new Task
router.post('/add', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

    try {
      const taskData = req.body;
      taskData.resourceType = 'Task'; // Ensure resourceType is set
      const accessToken = await getFhirAccessToken();
  
      const parent = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;
  
          // Construct the FHIR API URL
          const url = `${parent}/Task`;
  
          // Make the POST request to the FHIR server
          const response = await axios.post(url, taskData, {
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

    const parent = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;
  
    // Construct the FHIR API URL
    const url = `${parent}/Task`;

    // Make the POST request to the FHIR server
    const response = await axios.get(url, {
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

// Endpoint to get a specific Task by ID
router.get('/:id', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id } = req.params;

  try {
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/Task/${id}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const task = await handleBlobResponse(response.data);
    res.json(task);
  } catch (error) {
    console.error('Error fetching Task:', error);
    res.status(500).json({ error: `Failed to fetch Task: ${error.message}` });
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
    // Fetch the existing Task resource
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/Task/${id}`;
    const readResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const existingTask = readResponse.data;

    // Merge existing data with updates
    const updatedTask = { ...existingTask, ...updateData };

    // Update the Task in the FHIR store
    const updateResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.update({
      name: resourceUrl,
      requestBody: updatedTask,
      auth: auth,
    });

    res.json({ message: 'Task updated successfully', data: updateResponse.data });
  } catch (error) {
    console.error('Error updating Task:', error);
    res.status(500).json({ error: `Failed to update Task: ${error.message}` });
  }
});

export default router;
