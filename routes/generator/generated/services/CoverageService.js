// CoverageService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createCoverage(data) {
  logger.info(`Creating Coverage`, { data });
  return callFhirApi('POST', 'Coverage', data);
}

export async function getAllCoverages() {
  logger.info(`Fetching all Coverages`);
  return callFhirApi('GET', 'Coverage');
}

export async function getCoverageById(id) {
  logger.info(`Fetching Coverage`, { id });
  return callFhirApi('GET', `Coverage/${id}`);
}

export async function updateCoverage(id, data) {
  logger.info(`Updating Coverage`, { id, data });
  return callFhirApi('PUT', `Coverage/${id}`, data);
}

export async function deleteCoverage(id) {
  logger.info(`Deleting Coverage`, { id });
  return callFhirApi('DELETE', `Coverage/${id}`);
}


