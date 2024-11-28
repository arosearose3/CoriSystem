// ConsentService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createConsent(data) {
  logger.info(`Creating Consent`, { data });
  return callFhirApi('POST', 'Consent', data);
}

export async function getAllConsents() {
  logger.info(`Fetching all Consents`);
  return callFhirApi('GET', 'Consent');
}

export async function getConsentById(id) {
  logger.info(`Fetching Consent`, { id });
  return callFhirApi('GET', `Consent/${id}`);
}

export async function updateConsent(id, data) {
  logger.info(`Updating Consent`, { id, data });
  return callFhirApi('PUT', `Consent/${id}`, data);
}

export async function deleteConsent(id) {
  logger.info(`Deleting Consent`, { id });
  return callFhirApi('DELETE', `Consent/${id}`);
}


