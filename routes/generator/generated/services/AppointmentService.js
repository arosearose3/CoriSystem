// AppointmentService.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function createAppointment(data) {
  logger.info(`Creating Appointment`, { data });
  return callFhirApi('POST', 'Appointment', data);
}

export async function getAllAppointments() {
  logger.info(`Fetching all Appointments`);
  return callFhirApi('GET', 'Appointment');
}

export async function getAppointmentById(id) {
  logger.info(`Fetching Appointment`, { id });
  return callFhirApi('GET', `Appointment/${id}`);
}

export async function updateAppointment(id, data) {
  logger.info(`Updating Appointment`, { id, data });
  return callFhirApi('PUT', `Appointment/${id}`, data);
}

export async function deleteAppointment(id) {
  logger.info(`Deleting Appointment`, { id });
  return callFhirApi('DELETE', `Appointment/${id}`);
}


