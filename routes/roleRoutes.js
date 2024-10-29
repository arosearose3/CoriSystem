import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import axios from 'axios';
import { google } from 'googleapis';  // Assuming you use Google API for authentication
import { getFhirAccessToken } from '../src/lib/auth/auth.js'; // Adjust the path as needed
import {service_getPractitionerRolesByOrganization} from './roleService.js';
import {service_getPractitionerRoles} from './roleService.js';
import {service_createPractitionerRole} from './roleService.js';
import {service_updatePractitionerRoles} from './roleService.js';
import {service_deletePractitionerRole} from './roleService.js';


import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary

const base = BASE_PATH;
const router = express.Router();
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;


//find all PractionerRole resources for a single Org

router.get('/withOrganization', async (req, res) => {
  try {
    const { organizationId } = req.query;

    // Validate that the Organization ID is provided
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required.' });
    }

    // Call the service to get PractitionerRoles
    const practitionerRoles = await service_getPractitionerRolesByOrganization(organizationId);

    // Return the PractitionerRoles (FHIR Bundle)
    res.status(200).json(practitionerRoles);
  } catch (error) {
    console.error('Error fetching PractitionerRoles with Organization:', error.message);
    res.status(500).json({ error: 'Failed to fetch PractitionerRoles', details: error.message });
  }
});


//-------------------------------------------------
// Update PractitionerRole
router.put('/update', async (req, res) => {
  console.log ("role/update init");
  
    const updatedRole = req.body;
    const accessToken = await getFhirAccessToken();
    const searchUrl = `${FHIR_BASE_URL}/PractitionerRole/${updatedRole.id}`;
console.log ("role/update search:"+searchUrl);
console.log ("role/update obj:"+JSON.stringify(updatedRole));

try {
    // Make the request using axios
    const response = await axios.put(searchUrl, updatedRole, {
      headers: {
        Authorization: `Bearer ${accessToken}`, // Use the obtained access token
        'Content-Type': 'application/fhir+json', // Set content type to FHIR-compliant JSON
        Accept: 'application/fhir+json', // Ensure the response is also FHIR-compliant
      },
    });


    // Return the full updated PractitionerRole
    res.status(200).json(response.data); // Ensure you're returning the full updated resource
  } catch (error) {
    console.error('Error updating PractitionerRole:', error.message);
    res.status(500).json({ message: 'Failed to update practitioner role', error: error.message });
  }
});


router.patch('/patchAvailability', async (req, res) => {
  console.log("patchAvailability 1");
  const { practitionerRole, availableTime } = req.body;

  // Validate that the required data is provided
  if (!practitionerRole || !availableTime) {
    return res.status(400).json({ error: 'PractitionerRole and availableTime object are required.' });
  }
  console.log("patchAvailability 2");

  if (!practitionerRole.id) {
    return res.status(400).json({ error: 'PractitionerRole.id is required.' });
  }
  console.log("patchAvailability 3");

  let patchResource;
  console.log("patchAvailability PR:" + JSON.stringify(practitionerRole));
  console.log("patchAvailability availableTime:" + JSON.stringify(availableTime));

  try {
    // Check if availableTime already exists
    const hasAvailableTime = Array.isArray(practitionerRole.availableTime) && practitionerRole.availableTime.length > 0;
    console.log("patchAvailability 4");

    if (!hasAvailableTime) {
      // If availableTime does not exist, add it as a new element
      patchResource = [
        {
          op: 'add',
          path: '/availableTime', // Add availableTime as a new field
          value: availableTime, // The availableTime object to add
        },
      ];
    } else {
      // If availableTime exists, replace it with the provided availableTime object
      patchResource = [
        {
          op: 'replace',
          path: '/availableTime',
          value: availableTime, // Replace the existing availableTime with the new data
        },
      ];
    }

    // Prepare the PATCH request URL and headers
    const PRId = practitionerRole.id;
    const searchUrl = `${FHIR_BASE_URL}/PractitionerRole/${PRId}`;
    const accessToken = await getFhirAccessToken();

    // Perform the PATCH request
    const response = await axios.patch(searchUrl, patchResource, {
      headers: {
        'Content-Type': 'application/json-patch+json',
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });
    console.log("patchAvailability 5");

    // Handle the response and send it back
    const responseJ = await handleBlobResponse(response.data);
    res.json(responseJ);
  } catch (error) {
    console.error('Error updating PractitionerRoles:', error.message);
    res.status(500).json({ error: 'Failed to update PractitionerRoles', details: error.message });
  }
});


router.patch('/patchCapacity', async (req, res) => {
  const { practitionerRole, capacity } = req.body;
  if (!practitionerRole || !capacity) {
    return res.status(400).json({ error: 'practitionerRole and Capacity object are required.' });
  }
  if (!practitionerRole.id) {
    return res.status(400).json({ error: 'practitionerRole.id is required.' });
  }

    // Check if resourceType exists, if not, add it
    if (!practitionerRole.resourceType) {
      console.log('ResourceType not found in practitionerRole, adding it.');
      practitionerRole.resourceType = "PractitionerRole";
    } else if (practitionerRole.resourceType !== "PractitionerRole") {
      console.warn(`Unexpected resourceType: ${practitionerRole.resourceType}. Expected: PractitionerRole`);
    }
    
  try {
    if (!practitionerRole.extension) {
      practitionerRole.extension = [];
    }

    const extensionIndex = practitionerRole.extension?.findIndex(
      (ext) =>
        ext.url === 'https://combinebh.org/resources/FHIRResources/PractitionerCapacityFHIRExtension.html'
    ) ?? -1;

    if (extensionIndex === -1) {
      practitionerRole.extension.push(capacity);
    } else {
      practitionerRole.extension[extensionIndex] = capacity;
    }

    const accessToken = await getFhirAccessToken();
    const searchUrl = `${FHIR_BASE_URL}/PractitionerRole/${practitionerRole.id}`;
    console.log("cap patch/update search:" + searchUrl);
    console.log("****cap patch /update obj:" + JSON.stringify(practitionerRole));

    const updateResponse = await axios.put(searchUrl, practitionerRole, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
      },
    });

    // Axios doesn't have an 'ok' property, so we check the status directly
    if (updateResponse.status !== 200) {
      throw new Error(`Failed to update PractitionerRole. Status: ${updateResponse.status}`);
    }

    // Axios already parses the JSON for us, so we can access data directly
    const updatedPractitionerRole = updateResponse.data;

    res.status(200).json({
      message: 'PractitionerRole capacity updated successfully',
      data: updatedPractitionerRole
    });

  } catch (error) {
    console.error('patchcap/Error updating PractitionerRole:', error.message);
    res.status(500).json({
      error: 'patchcap/Failed to update PractitionerRole',
      details: error.message
    });
  }
});


// pathRoles expects a Practitioner and Organization, and will create a new PractitionerRole if there isn't one, with roles.
// if there is one, it will add or replace roles. 
// routes/practitionerRoutes.js
router.patch('/patchRoles', async (req, res) => {
  try {
    const { organization, practitioner, roles } = req.body;

    if (!practitioner?.reference || !organization?.reference || !Array.isArray(roles)) {
      return res.status(400).json({ 
        error: 'Practitioner reference, Organization reference, and roles array are required.' 
      });
    }

    const result = await service_updatePractitionerRoles(practitioner, organization, roles);
    
    const statusCode = result.action === 'created' ? 201 : 200;
    const message = `PractitionerRole ${result.action} successfully`;
    
    res.status(statusCode).json({ 
      message, 
      data: result.data 
    });

  } catch (error) {
    console.error('Error in patchRoles route:', error);

    if (error.message.includes('reference') || error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ 
      error: 'Failed to update PractitionerRole', 
      details: error.message 
    });
  }
});

// Get all PractitionerRoles
router.get('/all', async (req, res) => {
  try {
 

    const url = `${FHIR_BASE_URL}/PractitionerRole`;
    const accessToken = await getFhirAccessToken();

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });

    const roles = await handleBlobResponse(response.data);
    res.json(roles);
  } catch (error) {
    console.error('Error fetching practitioner roles:', error.message);
    res.status(500).json({ error: 'Failed to fetch practitioner roles', details: error.message });
  }
});




// Get PractitionerRole resources for a specific Practitioner
router.get('/PractitionerRole', async (req, res) => {
  try {
    const { practitioner } = req.query;
    
    if (!practitioner) {
      return res.status(400).json({ 
        error: 'Practitioner reference is required.' 
      });
    }

    const practitionerRoles = await service_getPractitionerRoles(practitioner);
    res.json(practitionerRoles);
  } catch (error) {
    console.error('Error in PractitionerRole route:', error);
    
    // Handle specific error cases
    if (error.message.includes('Practitioner reference is required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ 
      error: 'Failed to fetch PractitionerRoles', 
      details: error.message 
    });
  }
});

// Find PractitionerRole by Practitioner and Organization
router.get('/findPractitionerRole', async (req, res) => {
  try {
    const { practitioner, organizationId } = req.query;
    if (!practitioner || !organizationId) {
      return res.status(400).json({ error: 'Practitioner and Organization ID are required.' });
    }

    const url = `${FHIR_BASE_URL}/PractitionerRole?practitioner=${practitioner}`;
    const accessToken = await getFhirAccessToken();


    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });

    const practitionerRoles = await handleBlobResponse(response.data);
    const matchingRole = practitionerRoles.entry?.find(entry => entry.resource.organization?.reference === `Organization/${organizationId}`);

    if (matchingRole) {
      res.json({ practitionerRoleId: matchingRole.resource.id });
    } else {
      res.status(404).json({ message: 'No matching PractitionerRole found for the specified organization.' });
    }
  } catch (error) {
    console.error('Error finding PractitionerRole:', error.message);
    res.status(500).json({ error: 'Failed to find PractitionerRole', details: error.message });
  }
});

// Get a specific PractitionerRole by its ID
router.get('/getOne', async (req, res) => {
  try {
    const { id } = req.query; // Get the PractitionerRole ID from the query parameters
    if (!id) {
      return res.status(400).json({ error: 'PractitionerRole ID is required.' });
    }

    // Construct the FHIR API URL using the provided PractitionerRole ID
    const url = `${FHIR_BASE_URL}/PractitionerRole/${id}`;
    const accessToken = await getFhirAccessToken();

    // Make a GET request to fetch the PractitionerRole from the FHIR server
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`, // Pass the access token in the request headers
        Accept: 'application/fhir+json', // Set the appropriate headers to receive a FHIR-compliant JSON response
      },
    });

    // Handle the response and parse the JSON data
    const practitionerRole = await handleBlobResponse(response.data);

    // Send the retrieved PractitionerRole object back to the client
    res.status(200).json(practitionerRole);
  } catch (error) {
    console.error('Error fetching PractitionerRole:', error.message);
    res.status(500).json({ error: 'Failed to fetch PractitionerRole', details: error.message });
  }
});

// routes/practitionerRoutes.js
router.post('/create', async (req, res) => {
  try {
    const { practitionerId, organizationId } = req.body;

    // Validate request parameters
    if (!practitionerId || !organizationId) {
      return res.status(400).json({ 
        error: 'Practitioner ID and Organization ID are required.' 
      });
    }

    const createdRole = await service_createPractitionerRole(
      practitionerId, 
      organizationId
    );

    res.status(201).json({ 
      message: 'PractitionerRole created successfully', 
      data: createdRole 
    });
  } catch (error) {
    console.error('Error in create PractitionerRole route:', error);

    // Handle specific error cases
    if (error.message.includes('ID is required')) {
      return res.status(400).json({ error: error.message });
    }

    if (error.message.includes('Failed to obtain access token')) {
      return res.status(401).json({ error: error.message });
    }

    res.status(500).json({ 
      error: 'Failed to create PractitionerRole', 
      details: error.message 
    });
  }
});

// Delete a PractitionerRole by its ID
router.delete('/delete', async (req, res) => {
  const { practitionerRoleId } = req.query;

  // Validate required parameter
  if (!practitionerRoleId) {
      return res.status(400).json({ 
          error: 'PractitionerRole ID is required.' 
      });
  }

  try {
      console.log('Route: Processing delete request for PractitionerRole:', practitionerRoleId);
      
      const result = await service_deletePractitionerRole(practitionerRoleId);
      
      res.status(200).json({
          message: result.message
      });
  } catch (error) {
      console.error('Route: Error handling delete request:', error);
      
      // Determine appropriate status code
      const statusCode = error.status || 500;
      
      res.status(statusCode).json({
          error: 'Failed to delete PractitionerRole',
          details: error.details || error.message
      });
  }
});

// Add this to roleRoutes.js

// Get Organization and Practitioner names from PractitionerRole ID
router.get('/getOrgAndPract', async (req, res) => {
  try {
    const { PRid } = req.query;
    
    if (!PRid) {
      return res.status(400).json({ 
        error: 'PractitionerRole ID (PRid) is required.' 
      });
    }

    // First, get the PractitionerRole to get references
    const url = `${FHIR_BASE_URL}/PractitionerRole/${PRid}`;
    const accessToken = await getFhirAccessToken();

    const roleResponse = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });

    const practitionerRole = await handleBlobResponse(roleResponse.data);

    // Extract references
    const practitionerRef = practitionerRole.practitioner?.reference;
    const organizationRef = practitionerRole.organization?.reference;

    if (!practitionerRef || !organizationRef) {
      return res.status(404).json({ 
        error: 'PractitionerRole does not have both practitioner and organization references.' 
      });
    }

    // Get Practitioner details
    const practitionerId = practitionerRef.split('/').pop();
    const practitionerUrl = `${FHIR_BASE_URL}/Practitioner/${practitionerId}`;
    const practitionerResponse = await axios.get(practitionerUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });
    const practitioner = await handleBlobResponse(practitionerResponse.data);

    // Get Organization details
    const organizationId = organizationRef.split('/').pop();
    const organizationUrl = `${FHIR_BASE_URL}/Organization/${organizationId}`;
    const organizationResponse = await axios.get(organizationUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });
    const organization = await handleBlobResponse(organizationResponse.data);

    // Extract names
    // For practitioner, look for HumanName structure
    let practitionerName = 'Unknown';
    if (practitioner.name && practitioner.name.length > 0) {
      const name = practitioner.name[0];
      const given = name.given ? name.given.join(' ') : '';
      const family = name.family || '';
      practitionerName = `${given} ${family}`.trim();
    }

    // For organization, use the name field
    const organizationName = organization.name || 'Unknown Organization';

    res.status(200).json({
      practitionerName,
      organizationName,
      practitionerId,
      organizationId
    });

  } catch (error) {
    console.error('Error fetching organization and practitioner details:', error);
    
    // Handle specific error cases
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'PractitionerRole, Practitioner, or Organization not found' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to fetch details', 
      details: error.message 
    });
  }
});

export default router;
