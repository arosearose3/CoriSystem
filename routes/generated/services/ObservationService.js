// ObservationService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createObservation(data) {
  logger.info(`Creating Observation`, { data });
  return callFhirApi('POST', 'Observation', data);
}

export async function getAllObservations() {
  logger.info(`Fetching all Observations`);
  return callFhirApi('GET', 'Observation');
}

export async function getObservationById(id) {
  logger.info(`Fetching Observation`, { id });
  return callFhirApi('GET', `Observation/${id}`);
}

export async function updateObservation(id, data) {
  logger.info(`Updating Observation`, { id, data });
  return callFhirApi('PUT', `Observation/${id}`, data);
}

export async function deleteObservation(id) {
  logger.info(`Deleting Observation`, { id });
  return callFhirApi('DELETE', `Observation/${id}`);
}


