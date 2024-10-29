import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary


const router = express.Router();

// Endpoint to add a new Provenance resource
router.post('/add', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const provenanceData = req.body;
    provenanceData.resourceType = 'Provenance'; // Ensure resourceType is set

    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.create({
      parent,
      type: 'Provenance',
      requestBody: provenanceData,
      auth: auth,
    });

    res.status(201).json({ message: 'Provenance added successfully', data: response.data });
  } catch (error) {
    console.error('Error adding Provenance:', error);
    res.status(500).json({ error: `Failed to add Provenance: ${error.message}` });
  }
});

// Endpoint to get all Provenance resources
router.get('/all', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.search({
      parent,
      resourceType: 'Provenance',
      auth: auth,
    });

    const provenanceList = await handleBlobResponse(response.data);
    res.json(provenanceList);
  } catch (error) {
    console.error('Error fetching Provenance records:', error);
    res.status(500).json({ error: 'Failed to fetch Provenance records', details: error.message });
  }
});

// Endpoint to get a specific Provenance by ID
router.get('/:id', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id } = req.params;

  try {
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/Provenance/${id}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const provenance = await handleBlobResponse(response.data);
    res.json(provenance);
  } catch (error) {
    console.error('Error fetching Provenance:', error);
    res.status(500).json({ error: `Failed to fetch Provenance: ${error.message}` });
  }
});

// Endpoint to update a specific Provenance by ID
router.post('/update', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id, ...updateData } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Provenance ID is required for update.' });
  }

  try {
    // Fetch the existing Provenance resource
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/Provenance/${id}`;
    const readResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const existingProvenance = readResponse.data;

    // Merge existing data with updates
    const updatedProvenance = { ...existingProvenance, ...updateData };

    // Update the Provenance in the FHIR store
    const updateResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.update({
      name: resourceUrl,
      requestBody: updatedProvenance,
      auth: auth,
    });

    res.json({ message: 'Provenance updated successfully', data: updateResponse.data });
  } catch (error) {
    console.error('Error updating Provenance:', error);
    res.status(500).json({ error: `Failed to update Provenance: ${error.message}` });
  }
});

export default router;
