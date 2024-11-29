// EligibilityResponseService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createEligibilityResponse(data) {
  logger.info(`Creating EligibilityResponse`, { data });
  return callFhirApi('POST', 'EligibilityResponse', data);
}

export async function getAllEligibilityResponses() {
  logger.info(`Fetching all EligibilityResponses`);
  return callFhirApi('GET', 'EligibilityResponse');
}

export async function getEligibilityResponseById(id) {
  logger.info(`Fetching EligibilityResponse`, { id });
  return callFhirApi('GET', `EligibilityResponse/${id}`);
}

export async function updateEligibilityResponse(id, data) {
  logger.info(`Updating EligibilityResponse`, { id, data });
  return callFhirApi('PUT', `EligibilityResponse/${id}`, data);
}

export async function deleteEligibilityResponse(id) {
  logger.info(`Deleting EligibilityResponse`, { id });
  return callFhirApi('DELETE', `EligibilityResponse/${id}`);
}


