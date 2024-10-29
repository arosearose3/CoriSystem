import express, { response } from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import axios from 'axios';
import { google } from 'googleapis';  // Assuming you use Google API for authentication
import { getFhirAccessToken } from '../src/lib/auth/auth.js'; // Adjust the path as needed
import {UserAdminCodes} from './userAdminCodes.js';

import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary

import { service_extractOrganizations} from './organizationService.js';  
import { service_updateOrganization } from './organizationService.js'; // Import the service function



const router = express.Router();
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;


router.get('/getCodeByOrganizationId', (req, res) => {
  const { organizationId } = req.query;
  const orgId = organizationId;

  if (!orgId) {
    return res.status(400).json({ error: 'orgId is required' });
  }
  const found = UserAdminCodes.find(item => item.OrganizationId === orgId);
  if (!found) {
    return res.status(404).json({ error: 'Practitioner ID not found' });
  }
  return res.json({ code: found.code });
});

// Add a new Organization
router.post('/add', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  try {
    const organizationData = req.body;
    organizationData.resourceType = 'Organization';

    const createUrl = `${FHIR_BASE_URL}/Organization`;
    const accessToken = await getFhirAccessToken();

    console.log ("org/add createUrl:"+createUrl);
    console.log ("org/add data:"+JSON.stringify(organizationData));

    const createResponse = await axios.post(createUrl, organizationData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
      },
    });

    console.log ("org/add response:"+createResponse.data);
    console.log ("org/add jresponse:"+JSON.stringify(createResponse.data));

    res.status(201).json({ message: 'Organization added successfully', data: createResponse.data });
  }
   catch (error) {
    res.status(500).json({ message: 'Failed to add organization', error: error.message });
   }
});



// handles pagination
router.get('/all', async (req, res) => {
  // ... (authentication and initial setup)

  try {
    // Initial URL
    const url = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir/Organization`;

    // Retrieve the access token
    const accessToken = await getFhirAccessToken();

    if (!accessToken) {
      return res.status(401).json({ error: 'Authentication failed. Unable to retrieve access token.' });
    }

    console.log("Fetching organizations from:", url);

    // Extract all Organizations handling pagination
    const organizations = await service_extractOrganizations(url, accessToken);
    console.log("Successfully fetched organizations");

    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch organizations', details: error.message });
  }
});





// Get the name of an Organization by its reference
router.get('/getOrgName', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { reference } = req.query;
  //console.log ("org/getName reference:"+reference);
  // Extract organizationId from the reference, e.g., "Organization/71888285-135a-4eb2-a579-93e3f2e65ea8"
  const organizationId = reference?.split('/')[1];
  if (!organizationId) {
    return res.status(400).json({ error: 'Invalid organization reference. Unable to extract Organization ID.' });
  }
  try {
    const accessToken = await getFhirAccessToken();
    const searchUrl = `${FHIR_BASE_URL}/Organization/${organizationId}`;
    //console.log ("org/getName searchUrl:"+searchUrl);

    // Fetch the Organization details
    const organizationResponse = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });

    //console.log ("org/getname res:"+JSON.stringify(organizationResponse.data));
    // Extract the organization name from the response
    const organization = organizationResponse.data;
    const orgName = organization.name || 'Unknown Organization';

    console.log ("org/getname name:"+orgName);

    res.json(orgName );
  } catch (error) {
    console.error('Error fetching Organization name:', error.message);
    res.status(500).json({ error: 'Failed to fetch Organization name', details: error.message });
  }
});

//get admin email from OrgId 
router.get('/getOrgEmail', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { reference } = req.query;

  // Extract organizationId from the reference (e.g., "Organization/71888285-135a-4eb2-a579-93e3f2e65ea8")
  const organizationId = reference?.includes('/') ? reference.split('/')[1] : reference;

  if (!organizationId) {
    return res.status(400).json({ error: 'Invalid organization reference. Unable to extract Organization ID.' });
  }

  try {
    const accessToken = await getFhirAccessToken();
    const searchUrl = `${FHIR_BASE_URL}/Organization/${organizationId}`;

    const organizationResponse = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });

    const organization = organizationResponse.data;
    console.log("org getEmail org:", JSON.stringify(organization));
    let orgEmail = null;
    
/*     // Check if the 'contact' array exists and contains telecom data
    if (organization.contact && Array.isArray(organization.contact)) {
      // Loop through each contact to find the email
      for (const contact of organization.contact) {
        if (contact.telecom && Array.isArray(contact.telecom)) {
          const emailEntry = contact.telecom.find(t => t.system === 'email');
          if (emailEntry) {
            orgEmail = emailEntry.value;
            break; // Exit loop after finding the first email
          }
        }
      }
    } */

    // Check if the top-level 'telecom' array exists
      if (organization.telecom && Array.isArray(organization.telecom)) {
        // Find the first email entry in the telecom array
        const emailEntry = organization.telecom.find(t => t.system === 'email');
        if (emailEntry) {
          orgEmail = emailEntry.value;
        }
      }

    
    if (!orgEmail) {
      console.log("No email found for organization");
    }

    // Return the email in the correct structure
    res.json({ email: orgEmail });
    
  } catch (error) {
    console.error('Error fetching Organization email:', error.message);
    res.status(500).json({ error: 'Failed to fetch Organization email', details: error.message });
  }
});


//get one Organization  
router.get('/:organizationId', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  const { organizationId } = req.params;
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required.' });
  }
   console.log ("org/getone orgid:"+organizationId);
  try {
    const accessToken = await getFhirAccessToken();
    const searchUrl = `${FHIR_BASE_URL}/Organization/${organizationId}`;

    const organizationResponse = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`, // Use the getAccessToken function
        Accept: 'application/fhir+json', // Ensure the request is FHIR-compliant
      },
    });

    const organization = await handleBlobResponse(organizationResponse.data);
    res.json(organization);
  } catch (error) {
    console.error('Error fetching Organization:', error);
    res.status(500).json({ error: 'Failed to fetch Organization', details: error.message });
  }
});


//delete one Organization  
router.delete('/:organizationId', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  const { organizationId } = req.params;
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required.' });
  }
   console.log ("org/delete orgid:"+organizationId);
  try {
    const accessToken = await getFhirAccessToken();
    const searchUrl = `${FHIR_BASE_URL}/Organization/${organizationId}`;

    const organizationResponse = await axios.delete(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`, // Use the getAccessToken function
        Accept: 'application/fhir+json', // Ensure the request is FHIR-compliant
      },
    });

    const organization = await handleBlobResponse(organizationResponse.data);
    res.json(organization);
  } catch (error) {
    console.error('Error deleting Organization:', error);
    res.status(500).json({ error: 'Failed to delete Organization', details: error.message });
  }
});




/**
 * HTTP Route to update an Organization resource.
 * @route PUT /api/organization/update/:organizationId
 * @param {string} organizationId - The ID of the Organization to update.
 * @param {Object} req.body - The updated Organization resource data.
 * @returns {Object} - JSON response with the updated Organization data or an error message.
 */
router.put('/update/:organizationId', async (req, res) => {
  const { organizationId } = req.params;
  const updatedOrganizationData = req.body;

  // Validate Organization ID
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required.' });
  }

  // Validate Organization data
  if (!updatedOrganizationData || typeof updatedOrganizationData !== 'object') {
    return res.status(400).json({ error: 'Invalid organization data.' });
  }

  try {
    // Call the service function to update the organization
    const updatedOrganization = await service_updateOrganization(organizationId, updatedOrganizationData);
    
    // Return the updated organization data as the response
    res.status(200).json({
      message: 'Organization updated successfully',
      data: updatedOrganization
    });
  } catch (error) {
    // Handle any errors and return an appropriate response
    console.error('HTTP Route: Error updating Organization:', error.message || error.response?.data);
    res.status(500).json({
      error: 'Failed to update Organization',
      details: error.message || error.response?.data
    });
  }
});



export default router;
