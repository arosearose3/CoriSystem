// OrganizationService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createOrganization(data) {
  logger.info(`Creating Organization`, { data });
  return callFhirApi('POST', 'Organization', data);
}

export async function getAllOrganizations() {
  logger.info(`Fetching all Organizations`);
  return callFhirApi('GET', 'Organization');
}

export async function getOrganizationById(id) {
  logger.info(`Fetching Organization`, { id });
  return callFhirApi('GET', `Organization/${id}`);
}

export async function updateOrganization(id, data) {
  logger.info(`Updating Organization`, { id, data });
  return callFhirApi('PUT', `Organization/${id}`, data);
}

export async function deleteOrganization(id) {
  logger.info(`Deleting Organization`, { id });
  return callFhirApi('DELETE', `Organization/${id}`);
}


export async function getOrgName(reference) {
  logger.info(`Executing getOrgName`, { reference });
  return callFhirApi('GET', `Organization?${reference}`);
}

export async function getOrgEmail(reference) {
  logger.info(`Executing getOrgEmail`, { reference });
  return callFhirApi('GET', `Organization?${reference}`);
}
