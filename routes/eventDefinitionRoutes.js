import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary
import { getFhirAccessToken } from '../src/lib/auth/auth.js';
import axios from 'axios';


const router = express.Router();

// Endpoint to add a new EventDefinition
router.post('/add', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  try {
    const eventDefinitionData = req.body;
    eventDefinitionData.resourceType = 'EventDefinition'; // Ensure resourceType is set
    const accessToken = await getFhirAccessToken();

    const parent = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

        // Construct the FHIR API URL
        const url = `${parent}/EventDefinition`;

        // Make the POST request to the FHIR server
        const response = await axios.post(url, eventDefinitionData, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/fhir+json',
          },
        });
    
        // Handle and return the response
        const processedResponse = handleBlobResponse(response.data);
        res.status(201).json({ message: `${processedResponse.resourceType} added successfully`, data: processedResponse });
      } catch (error) {
        console.error('Error adding FHIR resource:', error);
        res.status(500).json({ error: `Failed to add eventDef resource: ${error.message}` });
      }
    });

  


// Endpoint to get all EventDefinitions
router.get('/all', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

   try {
   // const eventDefinitionData = req.body;
   // eventDefinitionData.resourceType = 'EventDefinition'; // Ensure resourceType is set
    const accessToken = await getFhirAccessToken();

    const parent = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

        // Construct the FHIR API URL
        const url = `${parent}/EventDefinition`;

        // Make the POST request to the FHIR server
        const response = await axios.get(url,  {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/fhir+json',
          },
        });
    

    const eventDefinitions = await handleBlobResponse(response.data);
    res.json(eventDefinitions);
  } catch (error) {
    console.error('Error fetching EventDefinitions:', error);
    res.status(500).json({ error: 'Failed to fetch EventDefinitions', details: error.message });
  }
});

// Endpoint to get a specific EventDefinition by ID
router.get('/:id', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id } = req.params;

  try {
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/EventDefinition/${id}`;
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const eventDefinition = await handleBlobResponse(response.data);
    res.json(eventDefinition);
  } catch (error) {
    console.error('Error fetching EventDefinition:', error);
    res.status(500).json({ error: `Failed to fetch EventDefinition: ${error.message}` });
  }
});

// Endpoint to delete a specific EventDefinition by ID
router.delete('/:id', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'EventDefinition ID is required for deletion.' });
  }

  try {
    const accessToken = await getFhirAccessToken();

    const resourceUrl = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/EventDefinition/${id}`;
    
    // Send DELETE request to the FHIR server
    const response = await axios.delete(resourceUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
      },
    });

    res.json({ message: `EventDefinition with ID '${id}' deleted successfully.` });
  } catch (error) {
    console.error(`Error deleting EventDefinition with ID ${id}:`, error);
    res.status(500).json({ error: `Failed to delete EventDefinition: ${error.message}` });
  }
});


// Endpoint to update a specific EventDefinition by ID
router.post('/update', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id, ...updateData } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'EventDefinition ID is required for update.' });
  }

  try {
    // Fetch the existing EventDefinition resource
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/EventDefinition/${id}`;
    const readResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const existingEventDefinition = readResponse.data;

    // Merge existing data with updates
    const updatedEventDefinition = { ...existingEventDefinition, ...updateData };

    // Update the EventDefinition in the FHIR store
    const updateResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.update({
      name: resourceUrl,
      requestBody: updatedEventDefinition,
      auth: auth,
    });

    res.json({ message: 'EventDefinition updated successfully', data: updateResponse.data });
  } catch (error) {
    console.error('Error updating EventDefinition:', error);
    res.status(500).json({ error: `Failed to update EventDefinition: ${error.message}` });
  }
});

export default router;
