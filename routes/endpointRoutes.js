// endpointRoutes.js

import express from 'express';
import { getFhirAccessToken} from '../src/lib/auth/auth.js';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';


import {
  service_createEndpoint,
  service_getEndpoint,
  service_updateEndpoint,
  service_deleteEndpoint,
  service_getAllEndpoints,
} from './endpointService.js';


const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;



const router = express.Router();

router.post('/create', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const endpointData = req.body;
  delete endpointData.nameplus; 

  console.log ("endpointRoutes endpointData:", endpointData);
  try {
    const createdEndpoint = await service_createEndpoint(endpointData);
    res.status(201).json({ message: 'Endpoint created successfully', data: createdEndpoint });
  } catch (error) {
    console.error('Error creating Endpoint:', error.message);
    res.status(500).json({ error: 'Failed to create Endpoint', details: error.message });
  }
});

router.get('/get', async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Endpoint ID is required.' });
  }

  try {
    const endpoint = await service_getEndpoint(id);
    res.status(200).json(endpoint);
  } catch (error) {
    console.error('Error fetching Endpoint:', error.message);
    res.status(500).json({ error: 'Failed to fetch Endpoint', details: error.message });
  }
});

router.put('/update', async (req, res) => {
  const updatedEndpointData = req.body;

  if (!updatedEndpointData.id) {
    return res.status(400).json({ error: 'Endpoint ID is required.' });
  }

  try {
    const updatedEndpoint = await service_updateEndpoint(updatedEndpointData);
    res.status(200).json({ message: 'Endpoint updated successfully', data: updatedEndpoint });
  } catch (error) {
    console.error('Error updating Endpoint:', error.message);
    res.status(500).json({ error: 'Failed to update Endpoint', details: error.message });
  }
});

router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;  // Use req.params instead of req.query

  if (!id) {
    return res.status(400).json({ error: 'Endpoint ID is required.' });
  }

  try {
    await service_deleteEndpoint(id);
    res.status(200).json({ message: 'Endpoint deleted successfully' });
  } catch (error) {
    console.error('Error deleting Endpoint:', error.message);
    res.status(500).json({ error: 'Failed to delete Endpoint', details: error.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const endpoints = await service_getAllEndpoints();
    res.status(200).json(endpoints);
  } catch (error) {
    console.error('Error fetching all Endpoints:', error.message);
    res.status(500).json({ error: 'Failed to fetch Endpoints', details: error.message });
  }
});

export default router;
