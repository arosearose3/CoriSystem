import express from 'express';
import axios from 'axios';
import { PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import { getFhirAccessToken } from '../src/lib/auth/auth.js';

const router = express.Router();
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;


router.post('/create', async (req, res) => {
  try {
    const templateData = req.body;

    // Basic validation
    if (!templateData.resourceType || templateData.resourceType !== 'Basic') {
      return res.status(400).json({ 
        error: 'Invalid resource type - must be Basic' 
      });
    }

    // Check if this is a timer event template
    if (templateData.extension?.[0]?.extension?.some(e => e.url === 'type' && e.valueString === 'timer')) {
      return res.status(400).json({ 
        error: 'Timer templates should be created through /api/timer endpoints' 
      });
    }

    // Get access token
    const accessToken = await getFhirAccessToken();

    // Forward to FHIR server
    const response = await axios.post(
      `${FHIR_BASE_URL}/Basic`,
      templateData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/fhir+json'
        }
      }
    );

    res.status(201).json({ 
      message: 'Event Template created successfully', 
      data: response.data 
    });

  } catch (error) {
    console.error('Error creating Event Template:', error);
    
    // Handle specific FHIR server errors
    if (error.response?.data) {
      return res.status(error.response.status).json({
        error: 'FHIR Server Error',
        details: error.response.data
      });
    }

    res.status(500).json({ 
      error: 'Failed to create Event Template', 
      details: error.message 
    });
  }
});

export async function createEventInstanceOld(templateId, targetResourceId) {
  const response = await axios.post(`${BASE_URL}/instance/create`, {
    resourceType: 'Basic',
    code: {
      coding: [{
        system: 'http://example.org/event-types',
        code: 'event-instance'
      }]
    },
    extension: [{
      url: 'http://example.org/event-instance',
      extension: [
        {
          url: 'templateReference',
          valueReference: {
            reference: `Basic/${templateId}`
          }
        },
        {
          url: 'targetResource',
          valueReference: {
            reference: targetResourceId
          }
        }
      ]
    }]
  });
  return response.data;
}

//retrieve all event templates of a certain type  
router.get('/search/byType', async (req, res) => {
  try {
    const { type } = req.query;

    if (!type) {
      return res.status(400).json({
        error: 'Type parameter is required'
      });
    }

    const accessToken = await getFhirAccessToken();

    const response = await axios.get(
      `${FHIR_BASE_URL}/Basic`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json'
        },
        params: {
        //  '_search': 'code',
          'code': 'event-template',
        //  'system': 'http://combinebh.org/fhir/template-types'
        }
      }
    );

    const bundle = await handleBlobResponse(response.data);
    const templates = bundle.entry?.map(entry => entry.resource) || [];

    // Filter by type
    const filteredTemplates = templates.filter(template => 
      template.extension?.[0]?.extension
        ?.some(e => e.url === 'type' && e.valueString === type)
    );

    console.log("in templateEvent/search filteredTemplates: ", JSON.stringify(filteredTemplates));
    res.json(filteredTemplates);

  } catch (error) {
    console.error('Error searching Event Templates by type:', error);
    res.status(500).json({
      error: 'Failed to search Event Templates',
      details: error.message
    });
  }
});

// GET /api/templates/events/all - Get all Event Templates
router.get('/all', async (req, res) => {
  try {
    const accessToken = await getFhirAccessToken();
    const { type } = req.query;  // Optional type filter

    const response = await axios.get(
      `${FHIR_BASE_URL}/Basic`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json'
        },
        params: {
          '_search': 'code',
          'code': 'event-template',
          'system': 'http://combinebh.org/fhir/template-types'
        }
      }
    );

    const bundle = await handleBlobResponse(response.data);
    let templates = bundle.entry?.map(entry => entry.resource) || [];
    
    // Apply type filter if provided
    if (type) {
      templates = templates.filter(template => 
        template.extension?.[0]?.extension
          ?.some(e => e.url === 'type' && e.valueString === type)
      );
    }

    res.json(templates);
  } catch (error) {
    console.error('Error fetching Event Templates:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Event Templates', 
      details: error.message 
    });
  }
});

// GET /api/templates/events/:id - Get specific Event Template
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Get access token
    const accessToken = await getFhirAccessToken();
    // Fetch the specific template using axios
    const response = await axios.get(
      `${FHIR_BASE_URL}/Basic/${id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json'
        }
      }
    );

    const template = await handleBlobResponse(response.data);

    // Verify this is an event template
/*     const isEventTemplate = template.code?.coding?.some(coding => 
      coding.system === 'http://terminology.organization.com/CodeSystem/template-types' &&
      coding.code === 'event-template'
    );

    if (!isEventTemplate) {
      return res.status(404).json({ error: 'Specified ID is not an Event Template' });
    } */

    res.json(template);
  } catch (error) {
    console.error('Error fetching Event Template:', error);
    res.status(500).json({ error: `Failed to fetch Event Template: ${error.message}` });
  }
});


// PUT /api/templates/events/{id} - Update Event Template
router.put('/:id', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id } = req.params;
  const updateData = req.body;

  try {
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/Basic/${id}`;
    
    // Fetch existing template
    const readResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const existingTemplate = await handleBlobResponse(readResponse.data);

    // Verify this is an event template
    const isEventTemplate = existingTemplate.code?.coding?.some(coding => 
      coding.system === 'http://terminology.organization.com/CodeSystem/template-types' &&
      coding.code === 'event-template'
    );

    if (!isEventTemplate) {
      return res.status(404).json({ error: 'Specified ID is not an Event Template' });
    }

    // Merge existing data with updates while preserving template type
    const updatedTemplate = {
      ...existingTemplate,
      ...updateData,
      code: existingTemplate.code // Preserve the template type coding
    };

    const updateResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.update({
      name: resourceUrl,
      requestBody: updatedTemplate,
      auth: auth,
    });

    res.json({ message: 'Event Template updated successfully', data: updateResponse.data });
  } catch (error) {
    console.error('Error updating Event Template:', error);
    res.status(500).json({ error: `Failed to update Event Template: ${error.message}` });
  }
});

// DELETE /api/templates/events/{id} - Delete Event Template
router.delete('/:id', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { id } = req.params;

  try {
    const resourceUrl = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/Basic/${id}`;
    
    // Verify this is an event template before deletion
    const readResponse = await healthcare.projects.locations.datasets.fhirStores.fhir.read({
      name: resourceUrl,
      auth: auth,
    });

    const template = await handleBlobResponse(readResponse.data);
    const isEventTemplate = template.code?.coding?.some(coding => 
      coding.system === 'http://terminology.organization.com/CodeSystem/template-types' &&
      coding.code === 'event-template'
    );

    if (!isEventTemplate) {
      return res.status(404).json({ error: 'Specified ID is not an Event Template' });
    }

    // Delete the template
    await healthcare.projects.locations.datasets.fhirStores.fhir.delete({
      name: resourceUrl,
      auth: auth,
    });

    res.json({ message: 'Event Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting Event Template:', error);
    res.status(500).json({ error: `Failed to delete Event Template: ${error.message}` });
  }
});



export default router;