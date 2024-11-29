// ServiceRequestService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createServiceRequest(data) {
  logger.info(`Creating ServiceRequest`, { data });
  return callFhirApi('POST', 'ServiceRequest', data);
}

export async function getAllServiceRequests() {
  logger.info(`Fetching all ServiceRequests`);
  return callFhirApi('GET', 'ServiceRequest');
}

export async function getServiceRequestById(id) {
  logger.info(`Fetching ServiceRequest`, { id });
  return callFhirApi('GET', `ServiceRequest/${id}`);
}

export async function updateServiceRequest(id, data) {
  logger.info(`Updating ServiceRequest`, { id, data });
  return callFhirApi('PUT', `ServiceRequest/${id}`, data);
}

export async function deleteServiceRequest(id) {
  logger.info(`Deleting ServiceRequest`, { id });
  return callFhirApi('DELETE', `ServiceRequest/${id}`);
}


export async function findByPatient(patientId) {
  logger.info(`Executing findByPatient`, { patientId });
  return callFhirApi('GET', `ServiceRequest?${patientId}`);
}

export async function findActive() {
  logger.info(`Executing findActive`);
  return callFhirApi('GET', `ServiceRequest`);
}
