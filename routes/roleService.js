// practitionerRoleService.js
import axios from 'axios';
import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary
import { getFhirAccessToken } from '../src/lib/auth/auth.js'; 
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;


import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';

/** 
* Service function to delete a PractitionerRole
* @param {string} practitionerRoleId - The ID of the PractitionerRole to delete
* @returns {Promise<Object>} Result of the deletion operation
* @throws {Error} If deletion fails
*/
export async function service_deletePractitionerRole(practitionerRoleId) {
   if (!practitionerRoleId) {
       throw new Error('PractitionerRole ID is required');
   }

   try {
       console.log('Service: Deleting PractitionerRole with ID:', practitionerRoleId);
       
       const accessToken = await getFhirAccessToken();
       const deleteUrl = `${FHIR_BASE_URL}/PractitionerRole/${practitionerRoleId}`;
       
       const deleteResponse = await axios.delete(deleteUrl, {
           headers: {
               Authorization: `Bearer ${accessToken}`,
               Accept: 'application/fhir+json',
           },
       });

       // Check response status
       if (deleteResponse.status === 200 || deleteResponse.status === 204) {
        return {
          success: true,
          message: 'PractitionerRole deleted successfully',
          status: deleteResponse.status
      };
       } else {
           throw new Error(`Unexpected response status: ${deleteResponse.status}`);
       }
   } catch (error) {
       console.error('Service: Error deleting PractitionerRole:', error);
       
       // Format error response
       throw {
           success: false,
           error: error.message,
           details: error.response?.data || error.message,
           status: error.response?.status || 500
       };
   }
}


/**
 * Creates a new PractitionerRole linking a Practitioner to an Organization
 * @param {string} practitionerId - The ID of the practitioner
 * @param {string} organizationId - The ID of the organization
 * @returns {Promise<Object>} The created PractitionerRole resource
 * @throws {Error} If required parameters are missing or if creation fails
 */
export async function service_createPractitionerRole(practitionerId, organizationId) {
  if (!practitionerId) {
    throw new Error('Practitioner ID is required');
  }
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  try {
    // Construct the FHIR PractitionerRole resource
    const practitionerRoleResource = {
      resourceType: 'PractitionerRole',
      practitioner: { reference: `Practitioner/${practitionerId}` },
      organization: { reference: `Organization/${organizationId}` },
      active: true
    };

    // Get access token for FHIR API
    const accessToken = await getFhirAccessToken();
    if (!accessToken) {
      throw new Error('Failed to obtain access token');
    }

    const createUrl = `${FHIR_BASE_URL}/PractitionerRole`;
    console.log('Creating PractitionerRole:', JSON.stringify(practitionerRoleResource, null, 2));

    const response = await axios.post(createUrl, practitionerRoleResource, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error in createPractitionerRole service:', error);
    throw new Error(`Failed to create PractitionerRole: ${error.message}`);
  }
}



/**
 * Fetches PractitionerRoles for a given practitioner ID
 * @param {string} practitionerId - The ID of the practitioner
 * @returns {Promise<Object>} The PractitionerRole resources
 * @throws {Error} If practitionerId is missing or if fetching fails
 */
export async function service_getPractitionerRoles(practitionerId) {
  if (!practitionerId) {
    throw new Error('Practitioner reference is required.');
  }
  try {
    const searchUrl = `${FHIR_BASE_URL}/PractitionerRole?practitioner=${practitionerId}`;
    const accessToken = await getFhirAccessToken();
    const response = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });
    const practitionerRoles = await handleBlobResponse(response.data);
    return practitionerRoles;
  } catch (error) {
    console.error('Error fetching PractitionerRoles:', error);
    throw new Error(`Failed to fetch PractitionerRoles: ${error.message}`);
  }
}

/**
 * Fetches PractitionerRoles for a given organization from the FHIR server.
 * @param {string} organizationId - The ID of the organization to search for.
 * @returns {Promise<object>} - The PractitionerRole FHIR Bundle or an error object.
 */
export async function service_getPractitionerRolesByOrganization(organizationId) {
  try {
    // Get the OAuth2 access token
    const accessToken = await getFhirAccessToken();
    
    // Construct the search URL for PractitionerRoles
    const searchUrl = `${FHIR_BASE_URL}/PractitionerRole?organization=Organization/${organizationId}`;
    console.log('role/withOrg searchUrl:', searchUrl);

    // Make the GET request to fetch the PractitionerRoles
    const response = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json', // Ensure the response is FHIR-compliant JSON
      },
    });
    const practitionerRoles = await handleBlobResponse(response.data);
    const entries = practitionerRoles.entry || []; // Handle if entry is missing or null
    return entries.map(entry => entry.resource); // Extract the resource from each entry, return ARRAY
 
   
  } catch (error) {
    console.error('Error fetching PractitionerRoles with Organization:', error.message);
    throw new Error('Failed to fetch PractitionerRoles');
  }
}



/**
 * Finds an existing PractitionerRole for a practitioner and organization
 * @param {string} practitionerId - The practitioner ID
 * @param {string} organizationId - The organization ID
 * @returns {Promise<string|null>} The PractitionerRole ID if found, null otherwise
 */
export async function service_findExistingPractitionerRole(practitionerId, organizationId) {
  const accessToken = await getFhirAccessToken();
  
  try {
    const findResponse = await axios.get(`${FHIR_BASE_URL}/PractitionerRole`, {
      params: { 
        practitioner: `Practitioner/${practitionerId}`,
        organization: `Organization/${organizationId}`
      },
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      },
    });

    const bundle = await handleBlobResponse(findResponse.data);
    const matchingRole = bundle.entry?.find(entry => 
      entry.resource.practitioner?.reference === `Practitioner/${practitionerId}` &&
      entry.resource.organization?.reference === `Organization/${organizationId}`
    );

    return matchingRole?.resource.id || null;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw new Error(`Failed to find PractitionerRole: ${error.message}`);
  }
}

/**
 * Patches an existing PractitionerRole with new roles
 * @param {string} roleId - The PractitionerRole ID
 * @param {string[]} roles - Array of role codes
 * @returns {Promise<Object>} The updated PractitionerRole
 */
export async function service_patchPractitionerRole(roleId, roles) {
  console.log("Entering service_patchPrRole with roleId:", roleId, "and roles:", roles);

  let accessToken;
  let existingRoleResponse;
  let patchResource;
  let patchUrl;
  let patchResponse;

  try {
    // Step 1: Get FHIR Access Token
    console.log("Attempting to fetch FHIR access token...");
    accessToken = await getFhirAccessToken();
    console.log("Successfully fetched access token.");

    // Step 2: Fetch the current PractitionerRole resource
    const existingRoleUrl = `${FHIR_BASE_URL}/PractitionerRole/${roleId}`;
    console.log("Fetching PractitionerRole from URL:", existingRoleUrl);
    
    existingRoleResponse = await axios.get(existingRoleUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });
    console.log("Successfully fetched PractitionerRole resource.");

  } catch (error) {
    console.error("Error fetching PractitionerRole resource:", error.response?.data || error.message);
    throw new Error(`Failed to fetch PractitionerRole resource: ${error.response?.data?.issue?.[0]?.diagnostics || error.message}`);
  }

  try {
    const practitionerRole = existingRoleResponse.data;
    const hasExistingCodes = practitionerRole.code && Array.isArray(practitionerRole.code);
    console.log("PractitionerRole resource:", practitionerRole, "Has existing codes:", hasExistingCodes);

    // Step 3: Build the patch operation
    patchResource = [
      {
        op: hasExistingCodes ? 'replace' : 'add', // Use 'add' if no existing code, otherwise 'replace'
        path: '/code',
        value: roles.map(role => ({
          coding: [{ system: 'https://combinebh.org/cori-value-set/', code: role }],
        })),
      },
    ];
    console.log("Patch resource to be sent:", JSON.stringify(patchResource, null, 2));

  } catch (error) {
    console.error("Error processing PractitionerRole resource or building patch resource:", error.message);
    throw new Error(`Failed to process PractitionerRole resource: ${error.message}`);
  }

  try {
    // Step 4: Patch the PractitionerRole resource with the new roles
    patchUrl = `${FHIR_BASE_URL}/PractitionerRole/${roleId}`;
    console.log("Patching PractitionerRole at URL:", patchUrl);

    patchResponse = await axios.patch(patchUrl, patchResource, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json-patch+json',
        Accept: 'application/fhir+json',
      },
    });
    console.log("Patch response:", patchResponse.data);

    return patchResponse.data;

  } catch (error) {
    console.error("Error patching PractitionerRole resource:", error.response?.data || error.message);
    throw new Error(`Failed to patch PractitionerRole resource: ${error.response?.data?.issue?.[0]?.diagnostics || error.message}`);
  }
}



/**
 * Main service function to update or create PractitionerRole with roles
 * Takes Practitioner reference and Organization reference, and array of role codes.  
 * This does not create a new PractitionerRole, just deals with roles. 
 */
export async function service_updatePractitionerRoles(practitionerRef, organizationRef, roles) {
  if (!practitionerRef || !organizationRef || !Array.isArray(roles)) {
    throw new Error('Practitioner reference, Organization reference, and roles array are required');
  }

  const practitionerId = practitionerRef.reference.replace('Practitioner/', '');
  const organizationId = organizationRef.reference.replace('Organization/', '');

  // Find existing role
  const existingRoleId = await service_findExistingPractitionerRole(practitionerId, organizationId);

  if (existingRoleId) {
    // Update existing role
    return {
      action: 'patched',
      data: await service_patchPractitionerRole(existingRoleId, roles)
    };
  } else {
    // Create new role
    return {
      action: 'created',
      data: await service_createPractitionerRole(practitionerId, organizationId, roles)
    };
  }
}

