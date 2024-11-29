// PractitionerService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createPractitioner(data) {
  logger.info(`Creating Practitioner`, { data });
  return callFhirApi('POST', 'Practitioner', data);
}

export async function getAllPractitioners() {
  logger.info(`Fetching all Practitioners`);
  return callFhirApi('GET', 'Practitioner');
}

export async function getPractitionerById(id) {
  logger.info(`Fetching Practitioner`, { id });
  return callFhirApi('GET', `Practitioner/${id}`);
}

export async function updatePractitioner(id, data) {
  logger.info(`Updating Practitioner`, { id, data });
  return callFhirApi('PUT', `Practitioner/${id}`, data);
}

export async function deletePractitioner(id) {
  logger.info(`Deleting Practitioner`, { id });
  return callFhirApi('DELETE', `Practitioner/${id}`);
}


