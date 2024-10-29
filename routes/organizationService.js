import axios from 'axios';
import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary
import { getFhirAccessToken } from '../src/lib/auth/auth.js'; 
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';

const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

// Get all Organizations given a nextPageUrl 
export async function service_extractOrganizations(url, accessToken) {
    let organizations = [];
    let nextPageUrl = url;
  
    while (nextPageUrl) {
      const response = await axios.get(nextPageUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json',
        },
      });
  
      const bundle = response.data;
  
      if (!bundle || bundle.resourceType !== 'Bundle' || !Array.isArray(bundle.entry)) {
        throw new Error('Invalid FHIR Bundle format');
      }
  
      // Extract Organizations
      const pageOrganizations = bundle.entry
        .map(entry => entry.resource)
        .filter(resource => resource.resourceType === 'Organization');
      
      organizations = organizations.concat(pageOrganizations);
  
      // Find the 'next' link for pagination
      const nextLink = bundle.link.find(link => link.relation === 'next');
      nextPageUrl = nextLink ? nextLink.url : null;
    }
  
    return organizations;
  }


/**
 * Service to update an Organization resource in the FHIR store.
 * @param {string} organizationId - The ID of the Organization to update.
 * @param {Object} updatedOrganizationData - The updated Organization resource data.
 * @returns {Object} - The updated Organization resource from the FHIR store.
 * @throws {Error} - Throws an error if the update fails.
 */
export async function service_updateOrganization(organizationId, updatedOrganizationData) {
  try {
    const accessToken = await getFhirAccessToken();
    const updateUrl = `${FHIR_BASE_URL}/Organization/${organizationId}`;
    
    console.log("Service: Updating Organization at URL:", updateUrl);
    console.log("Service: Organization update data:", JSON.stringify(updatedOrganizationData));

    // Perform the update request
    const updateResponse = await axios.put(updateUrl, updatedOrganizationData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
      },
    });

    console.log("Service: Updated organization data received:", updateResponse.data);
    return updateResponse.data;
  } catch (error) {
    console.error('Service: Error updating Organization:', error.message || error.response?.data);
    throw new Error(`Failed to update Organization: ${error.message || error.response?.data}`);
  }
}

