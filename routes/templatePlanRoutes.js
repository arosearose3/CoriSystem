// planTemplateRoutes.js
import express from 'express';
import axios from 'axios';
import { PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import { getFhirAccessToken } from '../src/lib/auth/auth.js';

const router = express.Router();
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

const constructFhirUrl = (resourceType, id = '') => `${FHIR_BASE_URL}/${resourceType}${id ? `/${id}` : ''}`;

// Get all plan templates
router.get('/all', async (req, res) => {
  try {
    const accessToken = await getFhirAccessToken();

    const response = await axios.get(
      constructFhirUrl('PlanDefinition'),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json',
        },
        params: {
          usage: 'cori-plan-template'
        }
      }
    );

    const bundle = await handleBlobResponse(response.data);
    
    // Post-process to ensure we only return templates
    const templates = bundle.entry
      ?.filter(entry => entry.resource.usage === 'cori-plan-template')
      .map(entry => entry.resource) || [];

    res.json(templates);
  } catch (error) {
    console.error('Error fetching Plan Templates:', error);
    res.status(500).json({ error: 'Failed to fetch Plan Templates' });
  }
});

// Create new plan template
router.post('/create', async (req, res) => {
  try {
    const accessToken = await getFhirAccessToken();
    const planData = req.body;
    
    // Ensure template fields
    planData.resourceType = 'PlanDefinition';
    planData.usage = 'cori-plan-template';
    planData.status = 'active';

    const response = await axios.post(
      constructFhirUrl('PlanDefinition'),
      planData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/fhir+json',
        }
      }
    );

    res.status(201).json(response.data);
  } catch (error) {
    console.error('Error creating Plan Template:', error);
    res.status(500).json({ error: 'Failed to create Plan Template' });
  }
});

// Update existing plan template
router.put('/:id', async (req, res) => {
  try {
    const accessToken = await getFhirAccessToken();
    const planData = req.body;
    
    const response = await axios.put(
      constructFhirUrl(`PlanDefinition/${req.params.id}`),
      planData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/fhir+json',
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error updating Plan Template:', error);
    res.status(500).json({ error: 'Failed to update Plan Template' });
  }
});

// Get all event templates (for reference)
router.get('/event-templates', async (req, res) => {
  try {
    const accessToken = await getFhirAccessToken();
    const response = await axios.get(
      constructFhirUrl('Basic'),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json',
        },
        params: {
          code: 'event-template'
        }
      }
    );

    const bundle = await handleBlobResponse(response.data);
    const templates = bundle.entry?.map(entry => entry.resource) || [];
    res.json(templates);
  } catch (error) {
    console.error('Error fetching Event Templates:', error);
    res.status(500).json({ error: 'Failed to fetch Event Templates' });
  }
});

export default router;