import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';

import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary


const router = express.Router();

// Endpoint to add a new Goal
router.post('/add', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const goalData = req.body;
    goalData.resourceType = 'Goal'; // Ensure resourceType is set

    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.create({
      parent,
      type: 'Goal',
      requestBody: goalData,
      auth: auth,
    });

    res.status(201).json({ message: 'Goal added successfully', data: response.data });
  } catch (error) {
    console.error('Error adding Goal:', error);
    res.status(500).json({ error: `Failed to add Goal: ${error.message}` });
  }
});

// Endpoint to get all Goals
router.get('/all', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.search({
      parent,
      resourceType: 'Goal',
      auth: auth,
    });

    const goals = await handleBlobResponse(response.data);
    res.json(goals);
  } catch (error) {
    console.error('Error fetching Goals:', error);
    res.status(500).json({ error: 'Failed to fetch Goals', details: error.message });
  }
});

// Endpoint to get a specific Goal by ID
router.get('/:id', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id } = req.params;

  try {
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/Goal?patient=${id}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const goal = await handleBlobResponse(response.data);
    res.json(goal);
  } catch (error) {
    console.error('Error fetching Goal:', error);
    res.status(500).json({ error: `Failed to fetch Goal: ${error.message}` });
  }
});

// Endpoint to update a specific Goal by ID
router.post('/update', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id, ...updateData } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Goal ID is required for update.' });
  }

  try {
    // Fetch the existing Goal resource
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/Goal/${id}`;
    const readResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const existingGoal = readResponse.data;

    // Merge existing data with updates
    const updatedGoal = { ...existingGoal, ...updateData };

    // Update the Goal in the FHIR store
    const updateResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.update({
      name: resourceUrl,
      requestBody: updatedGoal,
      auth: auth,
    });

    res.json({ message: 'Goal updated successfully', data: updateResponse.data });
  } catch (error) {
    console.error('Error updating Goal:', error);
    res.status(500).json({ error: `Failed to update Goal: ${error.message}` });
  }
});

export default router;
