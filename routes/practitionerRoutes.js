import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import axios from 'axios';

import { getFhirAccessToken } from '../src/lib/auth/auth.js'; 
import { service_getPractitionerById } from './practitionerService.js';
import { service_getPractitionerRolesByOrganization} from './roleService.js';
import { service_updatePractitionerEmailFromCode } from './practitionerService.js';
import { service_getAllPractitionerIds } from './practitionerService.js'; 
import { service_getAllPractitionerNamesAndIds } from './practitionerService.js';  
import { service_findPractitionerByEmail} from './practitionerService.js'; 
import { service_addPractitioner} from './practitionerService.js'; 
import { service_deletePractitionerAndRoles} from './practitionerService.js';
import { service_deletePractitioner} from './practitionerService.js';

import { UserCodes } from './userCodes.js'; //all the invite codes for Oct 2024 users
import { UserAdminCodes } from './userAdminCodes.js'; //all the invite codes for Oct 2024 users


import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary


const router = express.Router();
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;


router.delete('/deletePractitionerAndPractitionerRoles/:id', async (req, res) => {
  console.log("Starting deletion process for practitioner:", req.params.id);
  
  if (!auth) {
      return res.status(400).json({ 
          error: 'Not connected to Google Cloud. Call /connect first.' 
      });
  }
  
  try {
      const result = await service_deletePractitionerAndRoles(req.params.id);
      
      // Map service status to HTTP status code
      switch (result.status) {
          case 'SUCCESS':
              res.status(200).json({
                  message: `Practitioner with ID ${req.params.id} and associated roles successfully deleted`,
                  ...result
              });
              break;
              
          case 'PARTIAL_SUCCESS':
              res.status(207).json({
                  message: `Practitioner with ID ${req.params.id} deleted with some role deletions failed`,
                  ...result
              });
              break;
              
          default:
              res.status(500).json({
                  message: `Failed to delete practitioner with ID ${req.params.id}`,
                  ...result
              });
      }
  } catch (error) {
      res.status(500).json({
          message: `Error processing deletion request for practitioner ${req.params.id}`,
          error: error.message,
          details: error
      });
  }
});

router.get('/getBatch1CodeByPractitionerId', (req, res) => {
  const { practitionerId } = req.query;
  if (!practitionerId) {
    return res.status(400).json({ error: 'practitionerId is required' });
  }
  const found = UserCodes.find(item => item.practitionerId === practitionerId);
  if (!found) {
    return res.status(404).json({ error: 'Practitioner ID not found' });
  }
  return res.json({ code: found.code });
});

router.get('/getBatch1AdminCodeByOrganizationId', (req, res) => {
  const { orgId } = req.query;
  if (!orgId) {
    return res.status(400).json({ error: 'organizationId is required' });
  }
  const found = UserAdminCodes.find(item => item.practitionerId === practitionerId);
  if (!found) {
    return res.status(404).json({ error: 'Organization ID not found' });
  }
  return res.json({ code: found.code });
});

router.get('/getAllPractitionerNamesAndIds', async (req, res) => {
  try {
    const practitioners = await service_getAllPractitionerNamesAndIds();
    res.status(200).json(practitioners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/getAllIds', async (req, res) => {
  try {
    const practitionerIds = await service_getAllPractitionerIds();
    res.status(200).json(practitionerIds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//
// onboard new users by accepting a code from them, which we emailed them,
// and matching their code to the provider Id, and then assigning the Provider Resource the email
// then the system will recognize their email address when they log in. 

// this will work for Admins of Organizations 
// there exist practitioner Resources without emails, but no PractitionerRole
// the invite codes are linked to the PractitionerResource, so when the invite code is entered,
// the Practitioner ID is known, and the email can be linked. and the PractRole can be created. 
// then user has to log in again, and should see appropriate roles. 


router.post('/updateEmailFromCode', async (req, res) => {
  const { code, email, namestring } = req.body;

  console.log ("/updateEmailFromCode endpoint namestring:", namestring);
  if (!code || !email) {
    return res.status(400).json({ error: 'Code and email are required.' });
  }

  try {
    const result = await service_updatePractitionerEmailFromCode(code, email, namestring);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update an existing Practitioner
router.put('/update/:practitionerId', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const { practitionerId } = req.params;
  const practitionerData = req.body;

  if (!practitionerId || !practitionerData) {
    return res.status(400).json({ error: 'Practitioner ID and data are required.' });
  }

  try {
    // Ensure the resourceType is 'Practitioner' in the update data
    practitionerData.resourceType = 'Practitioner';
    practitionerData.id = practitionerId;

    const updateUrl = `${FHIR_BASE_URL}/Practitioner/${practitionerId}`;
    const accessToken = await getFhirAccessToken();

    console.log('Practitioner Data being sent:', practitionerData);
    console.log('Practitioner ID being sent:', practitionerId);
    console.log('url sent:', updateUrl);
    // Make the PUT request to update the Practitioner resource
    const response = await axios.put(updateUrl, practitionerData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',  // Ensure FHIR-compliant content type
        Accept: 'application/fhir+json',  // Ensure FHIR-compliant response
      },
    });

    // Handle the response and return the updated resource
    const updatedPractitioner = await handleBlobResponse(response.data);
    res.status(200).json({ message: 'Practitioner updated successfully', data: updatedPractitioner });
  } catch (error) {
    console.error('Error updating Practitioner:', error.response ? error.response.data : error.message);

    res.status(500).json({ error: 'Failed to update Practitioner', details: error.message });
  }
});


router.get('/findWithEmail', async (req, res) => {
  const { email } = req.query;

  try {
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const practitioners = await service_findPractitionerByEmail(email);
    
    if (practitioners) {
      return res.json(practitioners);
    } else {
      return res.status(404).json({ 
        message: 'No practitioner found with the provided email.' 
      });
    }
  } catch (error) {
    console.error('Error in findWithEmail route:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch Practitioner', 
      details: error.message 
    });
  }
});



router.post('/add', async (req, res) => {


  try {
    const practitionerResult = await service_addPractitioner(req.body);
    
    res.status(201).json({ 
      message: 'Practitioner added successfully', 
      practitionerID: practitionerResult.id 
    });
  } catch (error) {
    console.error('Error in add practitioner route:', error);
    
    if (error.message === 'Not connected to Google Cloud') {
      return res.status(400).json({ 
        error: 'Not connected to Google Cloud. Call /connect first.' 
      });
    }
    
    if (error.message === 'Unable to retrieve access token') {
      return res.status(401).json({ 
        error: 'Unable to retrieve access token.' 
      });
    }
    
    // Handle any other errors
    res.status(500).json({ 
      message: 'Failed to add practitioner', 
      error: error.message 
    });
  }
});


// Get all Practitioners for one Org
// Returns a JSON Object Bundle with resourceType, type and entry keypairs
router.get('/getStaffForOrg', async (req, res) => {
  const orgID = req.query.organizationId; // Use req.query.organizationId for consistency
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  try {
    const practitionerRoles = await service_getPractitionerRolesByOrganization (orgID);
   
    const practitionerIds = practitionerRoles.map(role => role.practitioner?.reference.split('/').pop());
    const practitioners = await Promise.all(
      practitionerIds.map(practitionerId => service_getPractitionerById(practitionerId))
    );
    
    const validPractitioners = practitioners.filter(practitioner => practitioner !== null);
    res.json({ resourceType: 'Bundle', type: 'collection', entry: validPractitioners.map(practitioner => ({ resource: practitioner })) });
  } catch (error) {
    console.error('Error fetching practitioners:', error);
    res.status(500).json({ error: 'Failed to fetch practitioners', details: error.message });
  }
});


// Get all Practitioners
router.get('/all', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  try {
    const accessToken = await getFhirAccessToken();
    let allPractitioners = [];
    let nextUrl = `${FHIR_BASE_URL}/Practitioner`; // Initial search URL
    let hasMorePages = true;

    while (hasMorePages) {
      const response = await axios.get(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json',
        },
      });

      // Process the current page of practitioners
      const currentPagePractitioners = await handleBlobResponse(response.data);
      console.log ("Pract route currentPagePract:",JSON.stringify(currentPagePractitioners));

      allPractitioners = [...allPractitioners, ...currentPagePractitioners.entry];

      // Check if there's a next page
      const nextLink = response.data?.link?.find(link => link.relation === 'next');
      if (nextLink && nextLink.url) {
        nextUrl = nextLink.url; // Move to the next page
      } else {
        hasMorePages = false; // No more pages
      }
    }

    res.json(allPractitioners); // Return all practitioners
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch practitioners', details: error.message });
  }
});


router.delete('/delete/:id', async (req, res) => {
  console.log("Route: Delete request for practitioner:", req.params.id);
  
  if (!auth) {
      return res.status(400).json({ 
          error: 'Not connected to Google Cloud. Call /connect first.' 
      });
  }
  
  const practitionerId = req.params.id;
  
  try {
      const accessToken = await getFhirAccessToken();
      
      const result = await service_deletePractitioner(practitionerId, accessToken);
      
      res.status(200).json({ 
          message: `Practitioner with ID ${practitionerId} deleted successfully` 
      });
  } catch (error) {
      console.error('Route: Error handling delete request:', error);
      
      res.status(500).json({ 
          message: `Failed to delete practitioner with ID ${practitionerId}`,
          error: error.error || error.message
      });
  }
});



  // Get all Practitioner Roles for a specific Practitioner ID
router.get('/practitioner/:practitionerId/role', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }

  const practitionerId = req.params.practitionerId;

  try {
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}`;

    // Search PractitionerRole by the practitioner reference ID
    const response = await healthcare.projects.locations.datasets.fhirStores.fhir.search({
      parent,
      resourceType: 'PractitionerRole',
      auth: auth,
      params: {
        'practitioner': `Practitioner/${practitionerId}`, // Filter by practitioner reference
      },
    });

    const practitionerRoles = await handleBlobResponse(response.data);
    res.json(practitionerRoles);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch roles for practitioner ${practitionerId}`, details: error.message });
  }
});


//Get One Practitioner - return just the resource
router.get('/:practitionerId', async (req, res) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  const { practitionerId } = req.params;
  if (!practitionerId) {
    return res.status(400).json({ error: 'Practitioner ID is required.' });
  }
  try {
    const practitioner = await service_getPractitionerById(practitionerId);
    if (!practitioner) {
      return res.status(404).json({ error: `Practitioner with ID ${practitionerId} not found.` });
    }
    // Respond with the practitioner data
    res.json(practitioner);
  } catch (error) {
    console.error('Error fetching Practitioner:', error);
    res.status(500).json({ error: 'Failed to fetch Practitioner', details: error.message });
  }
});


// Delete one provider based on name 
router.delete('/removeUnknown', async (req, res) => {
  console.log ("in remove");
 
    console.log ("in remove after try");
    // Get the OAuth2 access token
    const accessToken = await getFhirAccessToken();

    // Construct the search URL for what's to be deleted

    const searchUrl = `${FHIR_BASE_URL}/Practitioner?name:contains=Marta`;

    console.log ("remove search:"+searchUrl);
    // Make the GET request to search for unknown Practitioners
    const searchResponse = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });

    console.log ("remove response:"+JSON.stringify(searchResponse.data));
    const practitioners = searchResponse.data.entry || [];

    if (practitioners.length === 0) {
      return res.status(200).json({ message: 'No Practitioners found.' });
    }

    // Delete each found Practitioner
    const deletionPromises = practitioners.map(practitioner => 
      axios.delete(`${FHIR_BASE_URL}/Practitioner/${practitioner.resource.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json',
        },
      })
    );

    await Promise.all(deletionPromises);

    res.status(200).json({
      message: `Successfully deleted ${practitioners.length} Practitioner(s) with name "unknown".`,
      deletedCount: practitioners.length
    });
  
    console.error('Error in removeUnknown:', error.message);
    res.status(500).json({ error: 'An error occurred while removing unknown Practitioners.', details: error.message });
  
});


export default router;
