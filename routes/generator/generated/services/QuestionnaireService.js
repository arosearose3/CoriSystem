// QuestionnaireService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createQuestionnaire(data) {
  logger.info(`Creating Questionnaire`, { data });
  return callFhirApi('POST', 'Questionnaire', data);
}

export async function getAllQuestionnaires() {
  logger.info(`Fetching all Questionnaires`);
  return callFhirApi('GET', 'Questionnaire');
}

export async function getQuestionnaireById(id) {
  logger.info(`Fetching Questionnaire`, { id });
  return callFhirApi('GET', `Questionnaire/${id}`);
}

export async function updateQuestionnaire(id, data) {
  logger.info(`Updating Questionnaire`, { id, data });
  return callFhirApi('PUT', `Questionnaire/${id}`, data);
}

export async function deleteQuestionnaire(id) {
  logger.info(`Deleting Questionnaire`, { id });
  return callFhirApi('DELETE', `Questionnaire/${id}`);
}


