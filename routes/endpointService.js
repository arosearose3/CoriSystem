// endpointService.js

import axios from 'axios';

import { getFhirAccessToken} from '../src/lib/auth/auth.js';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';


const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;



export async function service_createEndpoint(endpointData) {
  const accessToken = await getFhirAccessToken();
  const url = `${FHIR_BASE_URL}/Endpoint`;

  const response = await axios.post(url, endpointData, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/fhir+json',
    },
  });

  return handleBlobResponse(response.data);
}

export async function service_getEndpoint(id) {
  const accessToken = await getFhirAccessToken();
  const url = `${FHIR_BASE_URL}/Endpoint/${id}`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/fhir+json',
    },
  });

  return handleBlobResponse(response.data);
}

export async function service_updateEndpoint(endpointData) {
  const accessToken = await getFhirAccessToken();
  const url = `${FHIR_BASE_URL}/Endpoint/${endpointData.id}`;

  const response = await axios.put(url, endpointData, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    },
  });

  return handleBlobResponse(response.data);
}

export async function service_deleteEndpoint(id) {
  const accessToken = await getFhirAccessToken();
  const url = `${FHIR_BASE_URL}/Endpoint/${id}`;

  await axios.delete(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/fhir+json',
    },
  });
}

export async function service_getAllEndpoints() {
  const accessToken = await getFhirAccessToken();
  const url = `${FHIR_BASE_URL}/Endpoint`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/fhir+json',
    },
  });

  return handleBlobResponse(response.data);
}
