// QuestionnaireResponseService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createQuestionnaireResponse(data) {
  logger.info(`Creating QuestionnaireResponse`, { data });
  return callFhirApi('POST', 'QuestionnaireResponse', data);
}

export async function getAllQuestionnaireResponses() {
  logger.info(`Fetching all QuestionnaireResponses`);
  return callFhirApi('GET', 'QuestionnaireResponse');
}

export async function getQuestionnaireResponseById(id) {
  logger.info(`Fetching QuestionnaireResponse`, { id });
  return callFhirApi('GET', `QuestionnaireResponse/${id}`);
}

export async function updateQuestionnaireResponse(id, data) {
  logger.info(`Updating QuestionnaireResponse`, { id, data });
  return callFhirApi('PUT', `QuestionnaireResponse/${id}`, data);
}

export async function deleteQuestionnaireResponse(id) {
  logger.info(`Deleting QuestionnaireResponse`, { id });
  return callFhirApi('DELETE', `QuestionnaireResponse/${id}`);
}


