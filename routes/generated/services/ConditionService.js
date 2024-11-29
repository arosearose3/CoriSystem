// ConditionService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createCondition(data) {
  logger.info(`Creating Condition`, { data });
  return callFhirApi('POST', 'Condition', data);
}

export async function getAllConditions() {
  logger.info(`Fetching all Conditions`);
  return callFhirApi('GET', 'Condition');
}

export async function getConditionById(id) {
  logger.info(`Fetching Condition`, { id });
  return callFhirApi('GET', `Condition/${id}`);
}

export async function updateCondition(id, data) {
  logger.info(`Updating Condition`, { id, data });
  return callFhirApi('PUT', `Condition/${id}`, data);
}

export async function deleteCondition(id) {
  logger.info(`Deleting Condition`, { id });
  return callFhirApi('DELETE', `Condition/${id}`);
}


