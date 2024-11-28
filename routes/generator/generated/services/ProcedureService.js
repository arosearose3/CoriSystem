// ProcedureService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createProcedure(data) {
  logger.info(`Creating Procedure`, { data });
  return callFhirApi('POST', 'Procedure', data);
}

export async function getAllProcedures() {
  logger.info(`Fetching all Procedures`);
  return callFhirApi('GET', 'Procedure');
}

export async function getProcedureById(id) {
  logger.info(`Fetching Procedure`, { id });
  return callFhirApi('GET', `Procedure/${id}`);
}

export async function updateProcedure(id, data) {
  logger.info(`Updating Procedure`, { id, data });
  return callFhirApi('PUT', `Procedure/${id}`, data);
}

export async function deleteProcedure(id) {
  logger.info(`Deleting Procedure`, { id });
  return callFhirApi('DELETE', `Procedure/${id}`);
}


