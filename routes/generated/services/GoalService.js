// GoalService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createGoal(data) {
  logger.info(`Creating Goal`, { data });
  return callFhirApi('POST', 'Goal', data);
}

export async function getAllGoals() {
  logger.info(`Fetching all Goals`);
  return callFhirApi('GET', 'Goal');
}

export async function getGoalById(id) {
  logger.info(`Fetching Goal`, { id });
  return callFhirApi('GET', `Goal/${id}`);
}

export async function updateGoal(id, data) {
  logger.info(`Updating Goal`, { id, data });
  return callFhirApi('PUT', `Goal/${id}`, data);
}

export async function deleteGoal(id) {
  logger.info(`Deleting Goal`, { id });
  return callFhirApi('DELETE', `Goal/${id}`);
}


