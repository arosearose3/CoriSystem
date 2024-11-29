// CommunicationService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createCommunication(data) {
  logger.info(`Creating Communication`, { data });
  return callFhirApi('POST', 'Communication', data);
}

export async function getAllCommunications() {
  logger.info(`Fetching all Communications`);
  return callFhirApi('GET', 'Communication');
}

export async function getCommunicationById(id) {
  logger.info(`Fetching Communication`, { id });
  return callFhirApi('GET', `Communication/${id}`);
}

export async function updateCommunication(id, data) {
  logger.info(`Updating Communication`, { id, data });
  return callFhirApi('PUT', `Communication/${id}`, data);
}

export async function deleteCommunication(id) {
  logger.info(`Deleting Communication`, { id });
  return callFhirApi('DELETE', `Communication/${id}`);
}


