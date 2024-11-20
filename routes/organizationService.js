import axios from 'axios';
import { getFhirAccessToken } from '../src/lib/auth/auth.js';
import { PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID } from '../serverutils.js';

const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

async function getHeaders() {
  const accessToken = await getFhirAccessToken();
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/fhir+json',
    Accept: 'application/fhir+json',
  };
}

const cleanObject = (obj) => {
  if (Array.isArray(obj)) {
    return obj
      .map(item => cleanObject(item))
      .filter(item => 
        item !== null && 
        item !== undefined && 
        (typeof item !== 'string' || item.trim() !== '')
      );
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanObject(value);
      if (
        cleanedValue !== null && 
        cleanedValue !== undefined && 
        !(Array.isArray(cleanedValue) && cleanedValue.length === 0) &&
        !(typeof cleanedValue === 'object' && Object.keys(cleanedValue).length === 0)
      ) {
        cleaned[key] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length ? cleaned : null;
  }
  
  return obj;
};

const createHumanName = (nameString) => {
  if (!nameString || typeof nameString !== 'string') return null;
  
  const parts = nameString.trim().split(' ');
  if (parts.length < 1) return null;
  
  return {
    use: 'official',
    family: parts[parts.length - 1],
    given: parts.slice(0, -1)
  };
};

const validateOrganizationData = (data) => {
  const errors = [];
  
  if (!data.name?.trim()) {
    errors.push('Organization name is required');
  }
  
  if (data.contact?.length) {
    data.contact.forEach((contact, index) => {
      if (contact.purpose?.coding?.[0]?.code && 
          !['ADMIN', 'BILL', 'PRESS'].includes(contact.purpose.coding[0].code)) {
        errors.push(`Invalid contact purpose code at index ${index}`);
      }
      
      if (contact.telecom?.length) {
        contact.telecom.forEach((telecom, telecomIndex) => {
          if (!telecom.system || !telecom.value) {
            errors.push(`Invalid telecom at contact ${index}, telecom ${telecomIndex}`);
          }
        });
      }
    });
  }

  return errors;
};

export async function createOrganization(organizationData) {
  try {
    // Transform the contact name from string to HumanName object if needed
    if (organizationData.contact) {
      organizationData.contact = organizationData.contact.map(contact => ({
        ...contact,
        name: typeof contact.name === 'string' ? createHumanName(contact.name) : contact.name
      }));
    }

    // Clean the data by removing empty values
    const cleanedData = cleanObject({
      ...organizationData,
      resourceType: 'Organization'
    });

    // Validate the cleaned data
    const validationErrors = validateOrganizationData(cleanedData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    const headers = await getHeaders();
    
    const response = await axios.post(
      `${FHIR_BASE_URL}/Organization`, 
      cleanedData, 
      { headers }
    );
    
    return response.data;
  } catch (error) {
    console.error('Service: Error creating Organization:', error);
    throw new Error(`Failed to create Organization: ${error.message}`);
  }
}

export async function getAllOrganizations(url = `${FHIR_BASE_URL}/Organization`) {
  try {
    let organizations = [];
    let nextPageUrl = url;
    const headers = await getHeaders();

    while (nextPageUrl) {
      const response = await axios.get(nextPageUrl, { headers });
      const bundle = response.data;

      if (!bundle || bundle.resourceType !== 'Bundle' || !Array.isArray(bundle.entry)) {
        throw new Error('Invalid FHIR Bundle format');
      }

      const pageOrganizations = bundle.entry
        .map(entry => entry.resource)
        .filter(resource => resource.resourceType === 'Organization');

      organizations = organizations.concat(pageOrganizations);

      const nextLink = bundle.link?.find(link => link.relation === 'next');
      nextPageUrl = nextLink ? nextLink.url : null;
    }

    return organizations;
  } catch (error) {
    console.error('Service: Error fetching Organizations:', error);
    throw new Error(`Failed to fetch Organizations: ${error.message}`);
  }
}

export async function getOrganizationById(organizationId) {
  try {
    const headers = await getHeaders();
    const response = await axios.get(`${FHIR_BASE_URL}/Organization/${organizationId}`, { headers });
    return response.data;
  } catch (error) {
    console.error('Service: Error fetching Organization:', error);
    throw new Error(`Failed to fetch Organization: ${error.message}`);
  }
}

export async function getOrganizationName(reference) {
  try {
    const organizationId = reference?.split('/')[1];
    if (!organizationId) {
      throw new Error('Invalid organization reference');
    }

    const organization = await getOrganizationById(organizationId);
    return organization.name || 'Unknown Organization';
  } catch (error) {
    console.error('Service: Error fetching Organization name:', error);
    throw new Error(`Failed to fetch Organization name: ${error.message}`);
  }
}

export async function getOrganizationEmail(reference) {
  try {
    const organizationId = reference?.includes('/') ? reference.split('/')[1] : reference;
    if (!organizationId) {
      throw new Error('Invalid organization reference');
    }

    const organization = await getOrganizationById(organizationId);
    let email = null;

    if (organization.telecom && Array.isArray(organization.telecom)) {
      const emailEntry = organization.telecom.find(t => t.system === 'email');
      if (emailEntry) {
        email = emailEntry.value;
      }
    }

    return { email };
  } catch (error) {
    console.error('Service: Error fetching Organization email:', error);
    throw new Error(`Failed to fetch Organization email: ${error.message}`);
  }
}

export async function updateOrganization(organizationId, updatedOrganizationData) {
  try {
    const headers = await getHeaders();
    const response = await axios.put(
      `${FHIR_BASE_URL}/Organization/${organizationId}`,
      updatedOrganizationData,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error('Service: Error updating Organization:', error);
    throw new Error(`Failed to update Organization: ${error.message}`);
  }
}

export async function deleteOrganization(organizationId) {
  try {
    const headers = await getHeaders();
    const response = await axios.delete(
      `${FHIR_BASE_URL}/Organization/${organizationId}`,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error('Service: Error deleting Organization:', error);
    throw new Error(`Failed to delete Organization: ${error.message}`);
  }
}