// PatientService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createPatient(data) {
  logger.info(`Creating Patient`, { data });
  return callFhirApi('POST', 'Patient', data);
}

export async function getAllPatients() {
  logger.info(`Fetching all Patients`);
  return callFhirApi('GET', 'Patient');
}

export async function getPatientById(id) {
  logger.info(`Fetching Patient`, { id });
  return callFhirApi('GET', `Patient/${id}`);
}

export async function updatePatient(id, data) {
  logger.info(`Updating Patient`, { id, data });
  return callFhirApi('PUT', `Patient/${id}`, data);
}

export async function deletePatient(id) {
  logger.info(`Deleting Patient`, { id });
  return callFhirApi('DELETE', `Patient/${id}`);
}


export async function getPatientName(reference) {
  logger.info(`Executing getPatientName`, { reference });
  return callFhirApi('GET', `Patient?${reference}`);
}

export async function searchByIdentifier(identifier) {
  logger.info(`Executing searchByIdentifier`, { identifier });
  return callFhirApi('GET', `Patient?${identifier}`);
}
