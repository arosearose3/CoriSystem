import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary

const router = express.Router();

// Endpoint to add a new Condition
router.post('/add', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const conditionData = req.body;
    conditionData.resourceType = 'Condition'; // Ensure resourceType is set

    console.log('api Condition/add data to be added:', JSON.stringify(conditionData));
  

    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.create({
      parent,
      type: 'Condition',
      requestBody: conditionData,
      auth: auth,
    });

    res.status(201).json({ message: 'Condition added successfully', data: response.data });
  } catch (error) {
    console.error('Error adding Condition:', error);
    res.status(500).json({ error: `Failed to add Condition: ${error.message}` });
  }
});

// Endpoint to get all Conditions
router.get('/all', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.search({
      parent,
      resourceType: 'Condition',
      auth: auth,
    });

    const conditions = await handleBlobResponse(response.data);
    res.json(conditions);
  } catch (error) {
    console.error('Error fetching Conditions:', error);
    res.status(500).json({ error: 'Failed to fetch Conditions', details: error.message });
  }
});

// Endpoint to get a specific Condition by ID
router.get('/:id', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id } = req.params;

  try {
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/Condition/${id}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const condition = await handleBlobResponse(response.data);
    res.json(condition);
  } catch (error) {
    console.error('Error fetching Condition:', error);
    res.status(500).json({ error: `Failed to fetch Condition: ${error.message}` });
  }
});

// Endpoint to update a specific Condition by ID
router.post('/update', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id, ...updateData } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Condition ID is required for update.' });
  }

  try {
    // Fetch the existing Condition resource
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/Condition/${id}`;
    const readResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const existingCondition = readResponse.data;

    // Merge existing data with updates
    const updatedCondition = { ...existingCondition, ...updateData };

    // Update the Condition in the FHIR store
    const updateResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.update({
      name: resourceUrl,
      requestBody: updatedCondition,
      auth: auth,
    });

    res.json({ message: 'Condition updated successfully', data: updateResponse.data });
  } catch (error) {
    console.error('Error updating Condition:', error);
    res.status(500).json({ error: `Failed to update Condition: ${error.message}` });
  }
});

export default router;
