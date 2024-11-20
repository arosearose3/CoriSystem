import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary


import { getFhirAccessToken } from '../src/lib/auth/auth.js'; // Adjust the path as needed
const router = express.Router();

// Endpoint to add a new ServiceRequest
router.post('/add', async (req, res) => {
 
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const serviceRequestData = req.body;

    console.log ('in SR add d:'+JSON.stringify(serviceRequestData));

    serviceRequestData.resourceType = 'ServiceRequest'; // Ensure resourceType is set

    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.create({
      parent,
      type: 'ServiceRequest',
      requestBody: serviceRequestData,
      auth: auth,
    });

    res.status(201).json({ message: 'ServiceRequest added successfully', data: response.data });
  } catch (error) {
    console.error('Error adding ServiceRequest:', error);
    res.status(500).json({ error: `Failed to add ServiceRequest: ${error.message}` });
  }
});

// Endpoint to get all ServiceRequests
router.get('/all', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.search({
      parent,
      resourceType: 'ServiceRequest',
      auth: auth,
    });

    const serviceRequests = await handleBlobResponse(response.data);
    res.json(serviceRequests);
  } catch (error) {
    console.error('Error fetching ServiceRequests:', error);
    res.status(500).json({ error: 'Failed to fetch ServiceRequests', details: error.message });
  }
});

// Endpoint to get a specific ServiceRequest by ID
router.get('/:id', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id } = req.params;

  try {
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/ServiceRequest?patient=${id}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const serviceRequest = await handleBlobResponse(response.data);
    res.json(serviceRequest);
  } catch (error) {
    console.error('Error fetching ServiceRequest:', error);
    res.status(500).json({ error: `Failed to fetch ServiceRequest: ${error.message}` });
  }
});

// Endpoint to update a specific ServiceRequest by ID
router.post('/update', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id, ...updateData } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ServiceRequest ID is required for update.' });
  }

  try {
    // Fetch the existing ServiceRequest resource
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/ServiceRequest/${id}`;
    const readResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const existingServiceRequest = readResponse.data;

    // Merge existing data with updates
    const updatedServiceRequest = { ...existingServiceRequest, ...updateData };

    // Update the ServiceRequest in the FHIR store
    const updateResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.update({
      name: resourceUrl,
      requestBody: updatedServiceRequest,
      auth: auth,
    });

    res.json({ message: 'ServiceRequest updated successfully', data: updateResponse.data });
  } catch (error) {
    console.error('Error updating ServiceRequest:', error);
    res.status(500).json({ error: `Failed to update ServiceRequest: ${error.message}` });
  }
});

export default router;
