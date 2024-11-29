// BasicService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createBasic(data) {
  logger.info(`Creating Basic`, { data });
  return callFhirApi('POST', 'Basic', data);
}

export async function getAllBasics() {
  logger.info(`Fetching all Basics`);
  return callFhirApi('GET', 'Basic');
}

export async function getBasicById(id) {
  logger.info(`Fetching Basic`, { id });
  return callFhirApi('GET', `Basic/${id}`);
}

export async function updateBasic(id, data) {
  logger.info(`Updating Basic`, { id, data });
  return callFhirApi('PUT', `Basic/${id}`, data);
}

export async function deleteBasic(id) {
  logger.info(`Deleting Basic`, { id });
  return callFhirApi('DELETE', `Basic/${id}`);
}


