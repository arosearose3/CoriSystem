// planDefinitionRoutes.js
import express from 'express';
import axios from 'axios';
import { 
  auth, 
  PROJECT_ID, 
  LOCATION, 
  DATASET_ID, 
  FHIR_STORE_ID, 
  handleBlobResponse 
} from '../serverutils.js';
import { getFhirAccessToken } from '../src/lib/auth/auth.js';

const router = express.Router();
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

// Create new PlanDefinition
router.post('/create', async (req, res) => {
  try {
    if (!auth) {
      return res.status(400).json({ 
        error: 'Not connected to Google Cloud. Call /connect first.' 
      });
    }

    const planDefinition = req.body;

    // Validate required fields
    if (!planDefinition.name || !planDefinition.status) {
      return res.status(400).json({ 
        error: 'Name and status are required fields.' 
      });
    }

    // Ensure resourceType is set
    planDefinition.resourceType = 'PlanDefinition';

    const accessToken = await getFhirAccessToken();
    const url = `${FHIR_BASE_URL}/PlanDefinition`;

    const response = await axios.post(url, planDefinition, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json'
      }
    });

    const createdPlanDefinition = await handleBlobResponse(response.data);
    res.status(201).json({
      message: 'PlanDefinition created successfully',
      data: createdPlanDefinition
    });

  } catch (error) {
    console.error('Error creating PlanDefinition:', error);
    res.status(500).json({
      error: 'Failed to create PlanDefinition',
      details: error.message
    });
  }
});

// Patch existing PlanDefinition
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patches = req.body;

    if (!Array.isArray(patches)) {
      return res.status(400).json({ 
        error: 'Patch must be an array of patch operations' 
      });
    }

    const accessToken = await getFhirAccessToken();
    const url = `${FHIR_BASE_URL}/PlanDefinition/${id}`;

    const response = await axios.patch(url, patches, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json-patch+json',
        Accept: 'application/fhir+json'
      }
    });

    const updatedPlanDefinition = await handleBlobResponse(response.data);
    res.json({
      message: 'PlanDefinition updated successfully',
      data: updatedPlanDefinition
    });

  } catch (error) {
    console.error('Error updating PlanDefinition:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'PlanDefinition not found' 
      });
    }

    res.status(500).json({
      error: 'Failed to update PlanDefinition',
      details: error.message
    });
  }
});

// Delete PlanDefinition
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const accessToken = await getFhirAccessToken();
    const url = `${FHIR_BASE_URL}/PlanDefinition/${id}`;

    await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });

    res.json({
      message: 'PlanDefinition deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting PlanDefinition:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'PlanDefinition not found' 
      });
    }

    res.status(500).json({
      error: 'Failed to delete PlanDefinition',
      details: error.message
    });
  }
});

// Get all PlanDefinitions
router.get('/all', async (req, res) => {
  try {
    const accessToken = await getFhirAccessToken();
    const url = `${FHIR_BASE_URL}/PlanDefinition`;

    // Add support for query parameters
    const queryParams = new URLSearchParams();
    if (req.query.status) queryParams.append('status', req.query.status);
    if (req.query.name) queryParams.append('name', req.query.name);
    if (req.query._count) queryParams.append('_count', req.query._count);

    const fullUrl = queryParams.toString() ? `${url}?${queryParams}` : url;

    const response = await axios.get(fullUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });

    const planDefinitions = await handleBlobResponse(response.data);
    res.json(planDefinitions);

  } catch (error) {
    console.error('Error fetching PlanDefinitions:', error);
    res.status(500).json({
      error: 'Failed to fetch PlanDefinitions',
      details: error.message
    });
  }
});

// Get PlanDefinition by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const accessToken = await getFhirAccessToken();
    const url = `${FHIR_BASE_URL}/PlanDefinition/${id}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });

    const planDefinition = await handleBlobResponse(response.data);
    res.json(planDefinition);

  } catch (error) {
    console.error('Error fetching PlanDefinition:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'PlanDefinition not found' 
      });
    }

    res.status(500).json({
      error: 'Failed to fetch PlanDefinition',
      details: error.message
    });
  }
});

// Search PlanDefinitions by type (event-only, full-workflow, etc.)
router.get('/search/byType', async (req, res) => {
  try {
    const { type } = req.query;
    
    if (!type) {
      return res.status(400).json({ 
        error: 'Type parameter is required' 
      });
    }

    const accessToken = await getFhirAccessToken();
    let url = `${FHIR_BASE_URL}/PlanDefinition?_tag=http://example.org/event-types|${type}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });

    const planDefinitions = await handleBlobResponse(response.data);
    res.json(planDefinitions);

  } catch (error) {
    console.error('Error searching PlanDefinitions:', error);
    res.status(500).json({
      error: 'Failed to search PlanDefinitions',
      details: error.message
    });
  }
});

// Validate PlanDefinition
router.post('/validate', async (req, res) => {
  try {
    const planDefinition = req.body;

    const accessToken = await getFhirAccessToken();
    const url = `${FHIR_BASE_URL}/PlanDefinition/$validate`;

    const response = await axios.post(url, planDefinition, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json'
      }
    });

    const validationResult = await handleBlobResponse(response.data);
    res.json({
      message: 'Validation completed',
      data: validationResult
    });

  } catch (error) {
    console.error('Error validating PlanDefinition:', error);
    res.status(500).json({
      error: 'Failed to validate PlanDefinition',
      details: error.message
    });
  }
});

export default router;