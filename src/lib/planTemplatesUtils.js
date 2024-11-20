// src/lib/api/planTemplates.js
import axios from 'axios';

const BASE_URL = '/api';

export async function getActivityTemplate(templateReference) {
  try {
    // Extract the template ID from the templateReference
    const templateId = templateReference.split('/').pop();

    // Make a GET request to fetch the activity template details
    const response = await axios.get(`/api/templates/activities/${templateId}`);
    
    // Return the response data
    return response;
  } catch (error) {
    console.error(`Error fetching activity template with ID ${templateReference}:`, error);
    throw new Error(`Failed to load activity template with ID ${templateReference}`);
  }
}

export async function getAllPlanTemplates() {
  try {
    const response = await axios.get(`${BASE_URL}/templates/plans/all`);
    return response.data;
  } catch (error) {
    console.error('Error fetching plan templates:', error);
    throw new Error('Failed to fetch plan templates');
  }
}

export async function createPlanInstance(planData) {
  try {
    const response = await axios.post(`${BASE_URL}/planDefinition/create`, planData);
    return response.data;
  } catch (error) {
    console.error('Error creating plan instance:', error);
    throw new Error('Failed to create plan instance');
  }
}

export async function updatePlanInstance(id, planData) {
  try {
    const response = await axios.patch(`${BASE_URL}/planDefinition/${id}`, planData);
    return response.data;
  } catch (error) {
    console.error('Error updating plan instance:', error);
    throw new Error('Failed to update plan instance');
  }
}

export async function getEventTemplates() {
  try {
    const response = await axios.get(`${BASE_URL}/templates/events/all`);
    return response.data;
  } catch (error) {
    console.error('Error fetching event templates:', error);
    throw new Error('Failed to fetch event templates');
  }
}

export async function searchPlansByType(type) {
  try {
    const response = await axios.get(`${BASE_URL}/planDefinition/search/byType`, {
      params: { type }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching plans:', error);
    throw new Error('Failed to search plans');
  }
}

export async function validatePlanDefinition(planData) {
  try {
    const response = await axios.post(`${BASE_URL}/planDefinition/validate`, planData);
    return response.data;
  } catch (error) {
    console.error('Error validating plan:', error);
    throw new Error('Failed to validate plan');
  }
}


export async function getUserPlanInstances () {return false;}
export async function getActivePlanInstances () {return false;}

export async function getEventTemplate(id) {
  const response = await fetch(`api/templates/events/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch event template');
  }
  return response.json();
}

