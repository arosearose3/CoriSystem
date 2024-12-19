
import { handleBlobResponse } from '../serverutils.js';
import { getFhirAccessToken } from '../src/lib/auth/auth.js';
import { PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID } from '../serverutils.js';
import axios from 'axios';



const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

export async function fetchPlanDefinitionById(id) {
  try {
    if (!id) {
      throw new Error('PlanDefinition ID is required');
    }

    const accessToken = await getFhirAccessToken();
    const url = `${FHIR_BASE_URL}/PlanDefinition/${id}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });

    return handleBlobResponse(response.data);
  } catch (error) {
    console.error(`Error fetching PlanDefinition/${id}:`, error);

    if (error.response?.status === 404) {
      throw new Error(`PlanDefinition with ID '${id}' not found`);
    }

    throw new Error(`Failed to fetch PlanDefinition: ${error.message}`);
  }
}

export async function findMatchingPlans(eventType, eventSource) {
    const accessToken = await getFhirAccessToken();
  
    let searchUrl = `${FHIR_BASE_URL}/PlanDefinition?`;
    
    switch (eventType) {
      case 'subscription':
        searchUrl += `trigger-event-source=${eventSource}`;
        break;
      case 'webhook':
        searchUrl += `trigger-webhook=${eventSource}`;
        break;
      case 'timer':
        searchUrl += `trigger-timer=${eventSource}`;
        break;
    }
  
    const response = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });
  
    return handleBlobResponse(response.data);
  }
  
  export async function executePlanDefinition(plan, context) {
    const accessToken = await getFhirAccessToken();
  
    // Call $apply operation
    const applyUrl = `${FHIR_BASE_URL}/PlanDefinition/${plan.id}/$apply`;
    
    const parameters = {
      resourceType: 'Parameters',
      parameter: [{
        name: 'eventContext',
        resource: {
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'eventType',
              valueString: context.eventType
            },
            {
              name: 'eventSource',
              valueString: context.eventSource
            },
            {
              name: 'payload',
              valueString: JSON.stringify(context.payload)
            },
            {
              name: 'auditEventId',
              valueString: context.auditEventId
            }
          ]
        }
      }]
    };
  
    const response = await axios.post(
      applyUrl,
      parameters,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/fhir+json'
        }
      }
    );
  
    return handleBlobResponse(response.data);
  }
  
  function getSourceReference(eventType, eventSource) {
    switch (eventType) {
      case 'subscription':
        return `Subscription/${eventSource}`;
      case 'webhook':
        return `Endpoint/${eventSource}`;
      case 'timer':
        return `Basic/${eventSource}`;
      default:
        return `Device/unknown`;
    }
  }
  