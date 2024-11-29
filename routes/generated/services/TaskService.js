// TaskService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createTask(data) {
  logger.info(`Creating Task`, { data });
  return callFhirApi('POST', 'Task', data);
}

export async function getAllTasks() {
  logger.info(`Fetching all Tasks`);
  return callFhirApi('GET', 'Task');
}

export async function getTaskById(id) {
  logger.info(`Fetching Task`, { id });
  return callFhirApi('GET', `Task/${id}`);
}

export async function updateTask(id, data) {
  logger.info(`Updating Task`, { id, data });
  return callFhirApi('PUT', `Task/${id}`, data);
}

export async function deleteTask(id) {
  logger.info(`Deleting Task`, { id });
  return callFhirApi('DELETE', `Task/${id}`);
}


export async function updateStatus(id, data) {
  logger.info(`Executing updateStatus`, { id, data });
  return callFhirApi('PUT', `Task/${id}`, data);
}

export async function findByServiceRequest(serviceRequestId) {
  logger.info(`Executing findByServiceRequest`, { serviceRequestId });
  return callFhirApi('GET', `Task?${serviceRequestId}`);
}
