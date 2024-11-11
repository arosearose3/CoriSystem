// endpointRoutes.js
/*
{
  "resourceType": "Endpoint",
  "status": "active",
  "connectionType": {
    "coding": [{
      "system": "http://example.org/endpoint-types",
      "code": "user-webhook"
    }]
  },
  "name": "My Patient Alert Webhook",
  // Owner stored in managingOrganization (searchable)
  "managingOrganization": {
    "reference": "Organization/123"
  },
  // User/PractitionerRole stored in contact (searchable)
  "contact": [{
    "reference": {
      "reference": "PractitionerRole/456"
    }
  }],
  "payloadType": [{
    "coding": [{
      "system": "http://example.org/webhook-events",
      "code": "patient-update"
    }]
  }],
  "address": "https://my-endpoint.com/webhook"
}

*/

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

// Create new Endpoint (webhook)
router.post('/create', async (req, res) => {
  try {
    if (!auth) {
      return res.status(400).json({ 
        error: 'Not connected to Google Cloud. Call /connect first.' 
      });
    }

    const {
      name,
      address,
      organizationId,
      practitionerRoleId,
      payloadTypes = ['patient-update'],
      status = 'active'
    } = req.body;

    // Validate required fields
    if (!name || !address || !organizationId || !practitionerRoleId) {
      return res.status(400).json({ 
        error: 'Name, address, organization ID, and practitioner role ID are required.' 
      });
    }

    const endpoint = {
      resourceType: "Endpoint",
      status,
      connectionType: {
        coding: [{
          system: "http://example.org/endpoint-types",
          code: "user-webhook"
        }]
      },
      name,
      address,
      managingOrganization: {
        reference: `Organization/${organizationId}`
      },
      contact: [{
        reference: {
          reference: `PractitionerRole/${practitionerRoleId}`
        }
      }],
      payloadType: payloadTypes.map(type => ({
        coding: [{
          system: "http://example.org/webhook-events",
          code: type
        }]
      }))
    };

    const accessToken = await getFhirAccessToken();
    const response = await axios.post(
      `${FHIR_BASE_URL}/Endpoint`,
      endpoint,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/fhir+json',
          Accept: 'application/fhir+json'
        }
      }
    );

    const createdEndpoint = await handleBlobResponse(response.data);
    res.status(201).json({
      message: 'Webhook endpoint created successfully',
      data: createdEndpoint
    });

  } catch (error) {
    console.error('Error creating webhook endpoint:', error);
    res.status(500).json({
      error: 'Failed to create webhook endpoint',
      details: error.message
    });
  }
});

// Get all Endpoints (webhooks) with filtering
router.get('/all', async (req, res) => {
  try {
    const { 
      organizationId, 
      practitionerRoleId,
      status = 'active',
      payloadType
    } = req.query;

    let url = `${FHIR_BASE_URL}/Endpoint?connection-type=user-webhook`;
    
    if (status) url += `&status=${status}`;
    if (organizationId) url += `&organization=${organizationId}`;
    if (practitionerRoleId) url += `&contact=${practitionerRoleId}`;
    if (payloadType) url += `&payload-type=${payloadType}`;

    const accessToken = await getFhirAccessToken();
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });

    const endpoints = await handleBlobResponse(response.data);
    res.json(endpoints);

  } catch (error) {
    console.error('Error fetching webhook endpoints:', error);
    res.status(500).json({
      error: 'Failed to fetch webhook endpoints',
      details: error.message
    });
  }
});

// Get Endpoint by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const accessToken = await getFhirAccessToken();
    const url = `${FHIR_BASE_URL}/Endpoint/${id}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });

    const endpoint = await handleBlobResponse(response.data);
    res.json(endpoint);

  } catch (error) {
    console.error('Error fetching webhook endpoint:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'Webhook endpoint not found' 
      });
    }

    res.status(500).json({
      error: 'Failed to fetch webhook endpoint',
      details: error.message
    });
  }
});

// Update Endpoint
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get existing endpoint first
    const accessToken = await getFhirAccessToken();
    const getUrl = `${FHIR_BASE_URL}/Endpoint/${id}`;
    
    const getResponse = await axios.get(getUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });

    const existingEndpoint = await handleBlobResponse(getResponse.data);

    // Update fields while maintaining resource consistency
    const updatedEndpoint = {
      ...existingEndpoint,
      name: updates.name || existingEndpoint.name,
      address: updates.address || existingEndpoint.address,
      status: updates.status || existingEndpoint.status,
      payloadType: updates.payloadTypes ? 
        updates.payloadTypes.map(type => ({
          coding: [{
            system: "http://example.org/webhook-events",
            code: type
          }]
        })) : 
        existingEndpoint.payloadType
    };

    // Update the endpoint
    const updateUrl = `${FHIR_BASE_URL}/Endpoint/${id}`;
    const updateResponse = await axios.put(
      updateUrl,
      updatedEndpoint,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/fhir+json',
          Accept: 'application/fhir+json'
        }
      }
    );

    const result = await handleBlobResponse(updateResponse.data);
    res.json({
      message: 'Webhook endpoint updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Error updating webhook endpoint:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'Webhook endpoint not found' 
      });
    }

    res.status(500).json({
      error: 'Failed to update webhook endpoint',
      details: error.message
    });
  }
});

// Update Endpoint status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'error', 'off'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: active, suspended, error, off'
      });
    }

    const accessToken = await getFhirAccessToken();
    const getUrl = `${FHIR_BASE_URL}/Endpoint/${id}`;
    
    const getResponse = await axios.get(getUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });

    const endpoint = await handleBlobResponse(getResponse.data);
    endpoint.status = status;

    const updateUrl = `${FHIR_BASE_URL}/Endpoint/${id}`;
    const updateResponse = await axios.put(
      updateUrl,
      endpoint,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/fhir+json',
          Accept: 'application/fhir+json'
        }
      }
    );

    const result = await handleBlobResponse(updateResponse.data);
    res.json({
      message: 'Webhook endpoint status updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Error updating webhook endpoint status:', error);
    res.status(500).json({
      error: 'Failed to update webhook endpoint status',
      details: error.message
    });
  }
});

// Delete Endpoint
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const accessToken = await getFhirAccessToken();
    const url = `${FHIR_BASE_URL}/Endpoint/${id}`;

    await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    res.json({
      message: 'Webhook endpoint deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting webhook endpoint:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'Webhook endpoint not found' 
      });
    }

    res.status(500).json({
      error: 'Failed to delete webhook endpoint',
      details: error.message
    });
  }
});

// Get Endpoints by Organization
router.get('/organization/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { status = 'active' } = req.query;

    const url = `${FHIR_BASE_URL}/Endpoint?` +
      `connection-type=user-webhook&` +
      `organization=${organizationId}&` +
      `status=${status}`;

    const accessToken = await getFhirAccessToken();
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });

    const endpoints = await handleBlobResponse(response.data);
    res.json(endpoints);

  } catch (error) {
    console.error('Error fetching organization webhook endpoints:', error);
    res.status(500).json({
      error: 'Failed to fetch organization webhook endpoints',
      details: error.message
    });
  }
});

// Get Endpoints by PractitionerRole
router.get('/practitionerRole/:practitionerRoleId', async (req, res) => {
  try {
    const { practitionerRoleId } = req.params;
    const { status = 'active' } = req.query;

    const url = `${FHIR_BASE_URL}/Endpoint?` +
      `connection-type=user-webhook&` +
      `contact=${practitionerRoleId}&` +
      `status=${status}`;

    const accessToken = await getFhirAccessToken();
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });

    const endpoints = await handleBlobResponse(response.data);
    res.json(endpoints);

  } catch (error) {
    console.error('Error fetching user webhook endpoints:', error);
    res.status(500).json({
      error: 'Failed to fetch user webhook endpoints',
      details: error.message
    });
  }
});

export default router;