import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary


const router = express.Router();

// Endpoint to add a new Consent
router.post('/add', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const consentData = req.body;
    consentData.resourceType = 'Consent'; // Ensure resourceType is set

    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.create({
      parent,
      type: 'Consent',
      requestBody: consentData,
      auth: auth,
    });

    res.status(201).json({ message: 'Consent added successfully', data: response.data });
  } catch (error) {
    console.error('Error adding Consent:', error);
    res.status(500).json({ error: `Failed to add Consent: ${error.message}` });
  }
});

// Endpoint to get all Consents
router.get('/all', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.search({
      parent,
      resourceType: 'Consent',
      auth: auth,
    });

    const consents = await handleBlobResponse(response.data);
    res.json(consents);
  } catch (error) {
    console.error('Error fetching Consents:', error);
    res.status(500).json({ error: 'Failed to fetch Consents', details: error.message });
  }
});

// Endpoint to get a specific Consent by ID
router.get('/:id', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id } = req.params;

  try {
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/Consent/${id}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const consent = await handleBlobResponse(response.data);
    res.json(consent);
  } catch (error) {
    console.error('Error fetching Consent:', error);
    res.status(500).json({ error: `Failed to fetch Consent: ${error.message}` });
  }
});

// Endpoint to update a specific Consent by ID
router.post('/update', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id, ...updateData } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Consent ID is required for update.' });
  }

  try {
    // Fetch the existing Consent resource
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/Consent/${id}`;
    const readResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const existingConsent = readResponse.data;

    // Merge existing data with updates
    const updatedConsent = { ...existingConsent, ...updateData };

    // Update the Consent in the FHIR store
    const updateResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.update({
      name: resourceUrl,
      requestBody: updatedConsent,
      auth: auth,
    });

    res.json({ message: 'Consent updated successfully', data: updateResponse.data });
  } catch (error) {
    console.error('Error updating Consent:', error);
    res.status(500).json({ error: `Failed to update Consent: ${error.message}` });
  }
});

export default router;
