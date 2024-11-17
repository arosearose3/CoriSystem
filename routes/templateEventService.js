// eventService.js
import axios from 'axios';

import { getFhirAccessToken } from '../src/lib/auth/auth.js';

import { auth, healthcare, BASE_PATH,PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';

const base = BASE_PATH;
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;



export async function createEventTemplate(templateData) {
  const accessToken = await getFhirAccessToken();
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
  return response.data;
}

export async function searchEventTemplatesByType(type) {
  const accessToken = await getFhirAccessToken();
  const response = await axios.get(
    `${FHIR_BASE_URL}/Basic`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      },
      params: { 'code': 'event-template' }
    }
  );

  const bundle = await handleBlobResponse(response.data);
  return bundle.entry?.map(entry => entry.resource)
    .filter(template => template.extension?.[0]?.extension
      ?.some(e => e.url === 'type' && e.valueString === type)) || [];
}

export async function getAllEventTemplates(type) {
  const accessToken = await getFhirAccessToken();
  const response = await axios.get(
    `${FHIR_BASE_URL}/Basic`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      },
      params: { '_search': 'code', 'code': 'event-template' }
    }
  );

  const bundle = await handleBlobResponse(response.data);
  let templates = bundle.entry?.map(entry => entry.resource) || [];

  if (type) {
    templates = templates.filter(template => 
      template.extension?.[0]?.extension
        ?.some(e => e.url === 'type' && e.valueString === type)
    );
  }
  
  return templates;
}

export async function getEventTemplateById(id) {
  const accessToken = await getFhirAccessToken();
  const response = await axios.get(
    `${FHIR_BASE_URL}/Basic/${id}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    }
  );

  return handleBlobResponse(response.data);
}

// Additional functions for update and delete can be added here as needed.
