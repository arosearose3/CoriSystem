import express from 'express';
import axios from 'axios';
import { PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import { getFhirAccessToken } from '../src/lib/auth/auth.js';

const router = express.Router();
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

// Utility function to construct FHIR resource URLs
const constructFhirUrl = (resourceType, id = '') => `${FHIR_BASE_URL}/${resourceType}${id ? `/${id}` : ''}`;

// POST /api/templates/activities/create
router.post('/create', async (req, res) => {
  try {
    const accessToken = await getFhirAccessToken();
    const templateData = req.body;

    const cleanedObject = Object.fromEntries(Object.entries(templateData).filter(([key, value]) => key !== 'id' || value !== null));


    const activityTemplate = {
      resourceType: 'ActivityDefinition',
      status: 'draft',
      experimental: false,
      kind: 'ServiceRequest',
      ...cleanedObject
    };
    const url = constructFhirUrl('ActivityDefinition');
    console.log('Creating Activity Template:', JSON.stringify(activityTemplate));
    console.log('URL:', url);
    const response = await axios.post(
      url,
      activityTemplate,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/fhir+json',
          Accept: 'application/fhir+json',
        },
      }
    );

    res.status(201).json({ message: 'Activity Template created successfully', data: response.data });
  } catch (error) {
    console.error('Error creating Activity Template:', error.message);
    res.status(500).json({ error: `Failed to create Activity Template: ${error.message}` });
  }
});

// GET /api/templates/activities/all
router.get('/all', async (req, res) => {
  try {
    const accessToken = await getFhirAccessToken();

    const response = await axios.get(
      constructFhirUrl('ActivityDefinition'),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json',
        },
        params: {
          kind: 'ServiceRequest',
          usage: 'combine-activity-template'
        }
      }
    );

    var templates = await handleBlobResponse(response.data);

    templates = templates.entry
    ?.filter(entry => {
      const resource = entry.resource;
      return resource.usage === 'combine-activity-template' &&
             resource.kind === 'ServiceRequest' &&
             resource.dynamicValue?.some(dv => 
               dv.path === 'endpoint' && 
               dv.expression?.language === 'text/fhirpath'
             );
    })
    .map(entry => entry.resource) || [];

    res.json(templates);
  } catch (error) {
    console.error('Error fetching Activity Templates:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch Activity Templates', 
      details: error.message 
    });
  }
});

// GET /api/templates/activities/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const accessToken = await getFhirAccessToken();

    const response = await axios.get(
      constructFhirUrl('ActivityDefinition', id),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json',
        },
      }
    );

    const template = await handleBlobResponse(response.data);
    if (template.kind !== 'ServiceRequest') {
      return res.status(404).json({ error: 'Specified ID is not an Activity Template' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching Activity Template:', error.message);
    res.status(500).json({ error: `Failed to fetch Activity Template: ${error.message}` });
  }
});

// PUT /api/templates/activities/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const accessToken = await getFhirAccessToken();

    const response = await axios.get(
      constructFhirUrl('ActivityDefinition', id),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json',
        },
      }
    );

    const existingTemplate = await handleBlobResponse(response.data);
    if (existingTemplate.kind !== 'ServiceRequest') {
      return res.status(404).json({ error: 'Specified ID is not an Activity Template' });
    }

    const updatedTemplate = { ...existingTemplate, ...updateData, kind: 'ServiceRequest' };

    const updateResponse = await axios.put(
      constructFhirUrl('ActivityDefinition', id),
      updatedTemplate,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/fhir+json',
          Accept: 'application/fhir+json',
        },
      }
    );

    res.json({ message: 'Activity Template updated successfully', data: updateResponse.data });
  } catch (error) {
    console.error('Error updating Activity Template:', error.message);
    res.status(500).json({ error: `Failed to update Activity Template: ${error.message}` });
  }
});

// DELETE /api/templates/activities/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const accessToken = await getFhirAccessToken();

    const response = await axios.get(
      constructFhirUrl('ActivityDefinition', id),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json',
        },
      }
    );

    const template = await handleBlobResponse(response.data);
    if (template.kind !== 'ServiceRequest') {
      return res.status(404).json({ error: 'Specified ID is not an Activity Template' });
    }

    await axios.delete(
      constructFhirUrl('ActivityDefinition', id),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json',
        },
      }
    );

    res.json({ message: 'Activity Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting Activity Template:', error.message);
    res.status(500).json({ error: `Failed to delete Activity Template: ${error.message}` });
  }
});

export default router;
