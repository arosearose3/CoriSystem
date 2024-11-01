// practitionerService.js

import axios from 'axios';
import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary
import { getFhirAccessToken } from '../src/lib/auth/auth.js'; 
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';


const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

import { UserCodes } from './userCodes.js'; // assuming UserCodes is in a separate file
import { UserAdminCodes } from './userAdminCodes.js'; // assuming UserCodes is in a separate file

import {service_getPractitionerRoles} from './roleService.js';
import {service_createPractitionerRole} from './roleService.js';
import {service_updatePractitionerRoles} from './roleService.js';
import {service_patchPractitionerRole} from './roleService.js';
import {service_findExistingPractitionerRole} from './roleService.js';
import {service_deletePractitionerRole} from './roleService.js';
import { merchantapi_products_v1beta } from 'googleapis';
 


export async function service_deletePractitioner(practitionerId) {
 

  try {
      const accessToken = await getFhirAccessToken();
      console.log("Service: Deleting practitioner:", practitionerId);
      
      const searchUrl = `${FHIR_BASE_URL}/Practitioner/${practitionerId}`;
      console.log(`Service: Delete URL: ${searchUrl}`);

      const response = await axios.delete(searchUrl, {
          headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/fhir+json',
          },
      });

      console.log(`Service: Delete response status: ${response.status}`);
      
      if (response.status === 200) {
          return {
              success: true,
              status: response.status
          };
      } else {
          throw new Error(`Unexpected response status: ${response.status}`);
      }
  } catch (error) {
      console.error('Service: Error deleting practitioner:', 
          error.response ? error.response.data : error.message
      );
      throw {
          success: false,
          error: error.response ? error.response.data : error.message
      };
  }
}


export async function service_deletePractitionerAndRoles(practitionerId) {
  let deletedRoles = [];
  let failedRoles = [];
  let practitionerDeleted = false;
  
  try {
      // 1. Get all PractitionerRoles for this Practitioner
      console.log("Fetching PractitionerRoles for practitioner:", practitionerId);
      const practitionerRoles = await service_getPractitionerRoles(practitionerId);
      
      // Handle case where practitionerRoles might be null or undefined
      let roles = [];
      if (practitionerRoles?.resourceType === 'Bundle' && Array.isArray(practitionerRoles.entry)) {
          roles = practitionerRoles.entry;
      } else if (Array.isArray(practitionerRoles)) {
          roles = practitionerRoles;
      }
      console.log(`Found ${roles.length} PractitionerRoles to delete`);

      // 2. Delete each PractitionerRole if any exist
      if (roles.length > 0) {
        for (const role of roles) {
            try {
                const roleId = role.resource?.id || role.id;
                const deleteResult = await service_deletePractitionerRole(roleId);
                deletedRoles.push(roleId);
                console.log(`Successfully deleted PractitionerRole: ${roleId}`);
            } catch (roleError) {
                const roleId = role.resource?.id || role.id;
                console.error(`Failed to delete PractitionerRole ${roleId}:`, roleError);
                failedRoles.push({
                    id: roleId,
                    error: roleError.message
                });
            }
        }
      }
      
      // 3. Delete the Practitioner
      console.log("Deleting Practitioner:", practitionerId);
      try {
          const deleteResult = await service_deletePractitioner(practitionerId);
          practitionerDeleted = deleteResult.success;
      } catch (practitionerError) {
          console.error("Error deleting practitioner:", practitionerError);
          practitionerDeleted = false;
          throw practitionerError;
      }
      
      // 4. Prepare result object
      const result = {
          success: practitionerDeleted,
          practitionerDeleted,
          deletedRoles,
          failedRoles,
          summary: {
              totalRoles: roles.length,
              successfulRoleDeletions: deletedRoles.length,
              failedRoleDeletions: failedRoles.length
          }
      };
      
      // Determine status based on results
      // Modified logic to handle no roles case
      if (roles.length === 0 && practitionerDeleted) {
          result.status = 'SUCCESS';
      } else if (failedRoles.length > 0 && practitionerDeleted) {
          result.status = 'PARTIAL_SUCCESS';
      } else if (practitionerDeleted) {
          result.status = 'SUCCESS';
      } else {
          result.status = 'FAILURE';
          throw new Error('Failed to delete practitioner');
      }
      
      return result;
      
  } catch (error) {
      console.error('Error in deletion process:', error.response ? error.response.data : error.message);
      
      throw {
          message: `Failed to complete deletion process for practitioner ${practitionerId}`,
          error: error.response ? error.response.data : error.message,
          deletedRoles,
          failedRoles,
          practitionerDeleteAttempted: true,
          practitionerDeleteSuccess: practitionerDeleted
      };
  }
}

export async function service_findPractitionerByEmail(email) {
  if (!email) {
    throw new Error('Email is required.');
  }
  try {
    console.log ("service_findPrByEmail, 1");
    const accessToken = await getFhirAccessToken();
    const searchUrl = `${FHIR_BASE_URL}/Practitioner?telecom=${email}`;
    const response = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });
    console.log ("service_findPrByEmail, 2");
    const practitioners = await handleBlobResponse(response.data);
    console.log ("service_findPrByEmail, 3");
    if (practitioners.entry && practitioners.entry.length > 0) {
      console.log ("service_findPrByEmail, 4");
      return practitioners.entry.map((practitioner) => practitioner.resource);
    } else {
      console.log ("service_findPrByEmail, 5");
      return null;
    }
  } catch (error) {
    console.error("Error in service_findPractitionerByEmail detailed:", {
      error: error.message,
      stack: error.stack,
      phase: error.phase || 'unknown',
      response: error.response?.data,
      email: email
    });
    throw error;
  }
}

// Function to get all Practitioner names and IDs
export async function service_getAllPractitionerNamesAndIds() {
  const accessToken = await getFhirAccessToken();
  if (!accessToken) {
    throw new Error('Unable to retrieve access token.');
  }

  let practitionerData = [];
  let nextUrl = `${FHIR_BASE_URL}/Practitioner?_count=100`; // Start with the first page

  try {
    while (nextUrl) {
      // Fetch the current page of Practitioners
      const response = await axios.get(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json',
        },
      });

     // console.log ("practService getAllNames response.data",JSON.stringify(response.data));
      const bundle = response.data;

      // Extract Practitioner names and IDs from the bundle's entries
      if (bundle.entry) {
        const practitioners = bundle.entry.map(entry => {
          const practitioner = entry.resource;
          const practitionerId = practitioner.id;
       //   console.log ("practService getAllName practName", practitioner.name[0]);

          // Extract the name from the Practitioner resource
          let fullName = 'Unknown Name';  // Default value if no name is available
          if (practitioner.name && practitioner.name.length > 0) {
            const name = practitioner.name[0];  // Use the first name in the array
            const givenNames = name.given ? name.given.join(' ') : '';
            const lastName = name.family || '';
            fullName = `${givenNames} ${lastName}`.trim();
          }

          return {
            fullName,
            practitionerId
          };
        });

        // Add practitioners from the current page to the list
        practitionerData = practitionerData.concat(practitioners);
      }

      // Find the 'next' link, if any, to fetch the next page
      const nextLink = bundle.link && bundle.link.find(link => link.relation === 'next');
      nextUrl = nextLink ? nextLink.url : null;  // If there's no 'next' link, stop
    }

    return practitionerData;

  } catch (error) {
    console.error('Error fetching all Practitioner names and IDs:', error.message);
    throw new Error(`Failed to fetch all Practitioner names and IDs: ${error.message}`);
  }
}


// Function to get all Practitioner IDs, returns a list of all the practitionerIds. 
export async function service_getAllPractitionerIds() {
  const accessToken = await getFhirAccessToken();
  if (!accessToken) {
    throw new Error('Unable to retrieve access token.');
  }

  let practitionerIds = [];
  let nextUrl = `${FHIR_BASE_URL}/Practitioner?_count=100`; // Start with the first page

  try {
    while (nextUrl) {
      // Fetch the current page of Practitioners
      const response = await axios.get(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json',
        },
      });

      const bundle = response.data;

      // Extract Practitioner IDs from the bundle's entries
      if (bundle.entry) {
        const ids = bundle.entry.map(entry => entry.resource.id);
        practitionerIds = practitionerIds.concat(ids);
      }

      // Find the 'next' link, if any, to fetch the next page
      const nextLink = bundle.link && bundle.link.find(link => link.relation === 'next');
      nextUrl = nextLink ? nextLink.url : null;  // If there's no 'next' link, stop
    }

    return practitionerIds;

  } catch (error) {
    console.error('Error fetching all Practitioner IDs:', error.message);
    throw new Error(`Failed to fetch all Practitioner IDs: ${error.message}`);
  }
}


// Function to update a practitioner's email based on a code
export async function service_updatePractitionerEmailFromCode(code, email, namestring) {
  // Try user code first from Batch 1
  const userCodeEntry = UserCodes.find(entry => entry.code === code);
  if (userCodeEntry) {
    return handleUserCode(userCodeEntry.practitionerId, email);
  }
  // Try admin code next from Batch 1
  const adminCodeEntry = findAdminCodeEntry(code);
  if (adminCodeEntry) {
    return handleAdminCode(adminCodeEntry.OrganizationId, email, namestring);
  }
  // Finally, search for practitioner with matching invite code extension
  const practitioner = await findPractitionerByInviteCode(code);
  if (practitioner) {
    await updatePractitionerWithRole(practitioner, email); //WRONG
    return { message: 'Email updated successfully via invite code.' };
  }
  throw new Error('Invalid code - not found in any valid location');
 }


 // updatePractitioner email, and create PractitionerRole for the org if there isn't one, and patch role. 
 async function updatePractitionerWithRole(practitioner, email) {
  await updatePractitionerEmail(practitioner, email);
  // Create provider role for the practitioner
  // the practitionerRole may have already been created in Add Staff. Check first. 

   const practitionerRole = await service_findExistingPractitionerRole(practitioner, organizationId)
  
  if (!practitionerRole) {
    const practRole = await service_createPractitionerRole(practitioner, organizationId);
  }
    await service_patchPractitionerRole(practRole.id, ['provider']);
 }

 async function handleUserCode(practitionerId, email) {
  const practitioner = await fetchPractitioner(practitionerId);
  await updatePractitionerEmail(practitioner, email);
  return { message: 'Email updated successfully.' };
}

async function handleAdminCode(orgId, email, namestring) {
  let practitionerId = await findOrCreatePractitioner(email, namestring);
  let practRole = await findOrCreatePractitionerRole(practitionerId, orgId);
  await service_patchPractitionerRole(practRole.id, ['provider', 'orgadmin']);
  return { message: 'Practitioner, Admin, Roles, and Email updated successfully.' };
}
 
async function findPractitionerByInviteCode(code) {
  console.log('Starting findPractitionerByInviteCode...', { code });
  
  try {
    // Log access token request
    console.log('Requesting FHIR access token...');
    const accessToken = await getFhirAccessToken();
    console.log('Access token obtained successfully');

    // Construct the request URL and parameters
    const url = `${FHIR_BASE_URL}/Practitioner`;
    const params = {
      _extension: `https://combinebh.org/resources/FHIRResources/InviteCode.html|${code}`
    };

    console.log('Making FHIR API request:', {
      url,
      params,
      headers: {
        Authorization: 'Bearer [REDACTED]',
        Accept: 'application/fhir+json'
      }
    });

    // Make the request
    const response = await axios.get(url, {
      params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });

    // Log successful response details
    console.log('FHIR API response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      total: response.data?.total,
      entryCount: response.data?.entry?.length
    });

    // Check for empty results
    if (!response.data.entry || response.data.entry.length === 0) {
      console.log('No practitioner found with provided invite code:', code);
      return null;
    }

    // Log found practitioner details (without sensitive information)
    const practitioner = response.data.entry[0].resource;
    console.log('Practitioner found:', {
      id: practitioner.id,
      resourceType: practitioner.resourceType,
      hasName: !!practitioner.name,
      hasIdentifier: !!practitioner.identifier,
      hasTelecom: !!practitioner.telecom,
      extensionCount: practitioner.extension?.length
    });

    return practitioner;

  } catch (error) {
    // Enhanced error logging
    console.error('Error in findPractitionerByInviteCode:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      // Axios specific error details
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      // Request details that caused the error
      requestURL: error.config?.url,
      requestMethod: error.config?.method,
      requestParams: error.config?.params,
      requestHeaders: {
        ...error.config?.headers,
        Authorization: '[REDACTED]' // Don't log the actual token
      }
    });

    // If it's a specific FHIR API error, log additional details
    if (error.response?.data?.issue) {
      console.error('FHIR API Error Details:', {
        issues: error.response.data.issue,
        operationOutcome: error.response.data
      });
    }

    // Rethrow with more context
    throw new Error(`Failed to find practitioner by invite code: ${error.message}`, {
      cause: error
    });
  }
}
 async function fetchPractitioner(practitionerId) {
  const accessToken = await getFhirAccessToken();
  const response = await axios.get(`${FHIR_BASE_URL}/Practitioner/${practitionerId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/fhir+json',
    }
  });
  return response.data;
}

async function updatePractitionerEmail(practitioner, email) {
  if (!practitioner.telecom) {
    practitioner.telecom = [];
  }
  const emailField = practitioner.telecom.find(contact => contact.system === 'email');
  if (emailField) {
    emailField.value = email;
  } else {
    practitioner.telecom.push({ system: 'email', value: email, use: 'work' });
  }
  
  const accessToken = await getFhirAccessToken();
  return axios.put(`${FHIR_BASE_URL}/Practitioner/${practitioner.id}`, practitioner, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    }
  });
}

async function findOrCreatePractitioner(email, namestring) {
  let existingPractitioner = await service_findPractitionerByEmail(email);
  if (existingPractitioner) {
    return existingPractitioner[0].id;
  }
  
  const practitionerResource = util_createPractitionerResource({ email, name: namestring });
  const newPractitioner = await service_addPractitioner(practitionerResource);
  return newPractitioner.id;
}

async function findOrCreatePractitionerRole(practitionerId, orgId) {
  let practRole = await service_findExistingPractitionerRole(practitionerId, orgId);
  if (!practRole) {
    practRole = await service_createPractitionerRole(practitionerId, orgId);
  }
  return practRole;
}
  

function findAdminCodeEntry(code) {
  if (!code) {
    throw new Error('Code is required');
  }
  // Always declare variables
  const userCodeEntry = UserAdminCodes.find(entry => entry.code === code);
  console.log("Checking admin code:", code, "Found entry:", userCodeEntry);
  return userCodeEntry || null;
}


function generateInviteCode() {
  const chars = 'abcdefghijkmnopqrstuvwxyz023456789';
  let code = '';
  for (let i = 0; i < 9; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function service_addPractitioner(practitionerData) {
  console.log('Starting service_addPractitioner');
  try {
    let emailToCheck = practitionerData.telecom?.find(t => t.system === 'email')?.value;
    if (!emailToCheck) {
     // throw new Error('Email is required');
     // it's actually OK to make a Practitioner without an email, this is for the invitecode login flow
    }

    if (emailToCheck) {
    const existingPractitioner = await service_findPractitionerByEmail(emailToCheck);
    if (existingPractitioner) {
      throw new Error('Practitioner already exists');
    }
    } 
  }catch (err) {
        throw err;
    }

  
  try {
  if (!auth) {
      throw new Error('Not connected to Google Cloud');
  }

  // Ensure proper FHIR resource type
  // there is no email in the system for this practitioner, therefor generate InviteCode. 
  // as an extension object.  

     // Only remove birthDate if undefined
     if (practitionerData.birthDate === "" || practitionerData.birthDate === undefined) {
      delete practitionerData.birthDate;
    }
 
// Handle nested empty values
if (practitionerData.telecom) {
  practitionerData.telecom = practitionerData.telecom.filter(t => t.value !== "");
}

if (practitionerData.identifier) {
  practitionerData.identifier = practitionerData.identifier.filter(id => id.value !== "");
}

// Remove top-level empty values
Object.keys(practitionerData).forEach(key => {
  if (practitionerData[key] === "" || practitionerData[key] === null) {
    delete practitionerData[key];
  }
});

  practitionerData.resourceType = 'Practitioner';

     // Generate and add invite code extension
     const inviteCode =  generateInviteCode();
     if (!practitionerData.extension) {
       practitionerData.extension = [];
     }
     practitionerData.extension.push({
       url: "https://combinebh.org/resources/FHIRResources/InviteCode.html",
       valueString: inviteCode
     });

     console.log('pract/create/Prepared practitioner data:', JSON.stringify(practitionerData, null, 2));

  // Get access token
  console.log('Getting access token...');
  const accessToken = await getFhirAccessToken();
  if (!accessToken) {
      throw new Error('Unable to retrieve access token');
  }
  console.log('Got access token');

  
      const url = `${FHIR_BASE_URL}/Practitioner`;
      console.log('Making POST request to:', url);
      
      const response = await axios.post(url, practitionerData, {
          headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/fhir+json',
              'Content-Type': 'application/fhir+json'
          }
      });
      
      console.log('Received response:', JSON.stringify(response.data, null, 2));
      console.log('Practitioner ID from response:', response.data.id);

      const result = {
          id: response.data.id,
          data: response.data
      };
      
      console.log('Returning result from service_addPractitioner:', JSON.stringify(result, null, 2));
      return result;
      
  } 
  catch (error) {
      console.error('Error in addPractitioner:', error);
      console.error('Error response data:', error.response?.data);
      throw error;
  }
}


export async function service_addPractitionerFromSessionData(practitionerData, userContext) {
  if (!auth) {
    throw new Error('Not connected to Google Cloud');
  }
  // You can use the user context for authorization or logging
  console.log(`User ${userContext?.name} (${userContext?.email}) attempting to add practitioner`);

  practitionerData.resourceType = 'Practitioner';

  const accessToken = await getFhirAccessToken();
  if (!accessToken) {
    throw new Error('Unable to retrieve access token');
  }

  try {
    const url = `${FHIR_BASE_URL}/Practitioner`;
    const response = await axios.post(url, practitionerData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
        'Content-Type': 'application/fhir+json'
      }
    });

    return {
      id: response.data.id,
      data: response.data,
      createdBy: userContext?.email // Optional: track who created the practitioner
    };
  } catch (error) {
    console.error(`Error in addPractitioner (requested by ${userContext?.email}):`, error);
    throw error;
  }
}


/**
 * Fetches a Practitioner by ID from the FHIR server.
 * @param {string} practitionerId - The ID of the practitioner to fetch.
 * @returns {Promise<object|null>} - The Practitioner data or null if an error occurs. As an ARRAY
 */
export async function service_getPractitionerById(practitionerId) {
  try {
    const accessToken = await getFhirAccessToken();
    const practitionerResponse = await axios.get(`${FHIR_BASE_URL}/Practitioner/${practitionerId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });

    const practitioner = await handleBlobResponse(practitionerResponse.data);
    return practitioner;

  } catch (error) {
    console.error(`Failed to fetch Practitioner with ID ${practitionerId}:`, error.message);
    return null; // Return null or handle missing practitioners as needed
  }
}



/**
 * Creates a FHIR-compliant Practitioner resource from user context
 * @param {Object} userContext - Contains user's name and email
 * @returns {Object} FHIR Practitioner resource
 */
function util_createPractitionerResource(userContext) {
  if (!userContext?.name || !userContext?.email) {
    throw new Error('User name and email are required');
  }

  // Split the full name into words
  const nameParts = userContext.name.trim().split(/\s+/);
  
  // Last word is family name, everything else is given names
  const familyName = nameParts[nameParts.length - 1];
  const givenNames = nameParts.slice(0, -1);

  return {
    resourceType: "Practitioner",
    name: [
      {
        use: "official",
        family: familyName,
        given: givenNames.length > 0 ? givenNames : undefined
      }
    ],
    telecom: [
      {
        system: "email",
        value: userContext.email,
        use: "work"
      }
    ]
  };
}
