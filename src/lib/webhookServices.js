// src/lib/services/webhookServices.js
//
//  these services are for the Svelte Client, not the Express server
//
import axios from 'axios';

export async function getAllWebhooks() {
  const response = await axios.get('/api/webhook/all');
  return response.data;
}

export async function createWebhook(webhookData) {
  const response = await axios.post('/api/webhook/create', webhookData);
  console.log("webhookServices-client createWebhook response.data:", response.data);
  return response.data;
}

export async function updateWebhook(id, webhookData) {
  const response = await axios.put(`/api/webhook/${id}`, webhookData);
  return response.data;
}

export async function deleteWebhook(id) {
  const response = await axios.delete(`/api/webhook/${id}`);
  return response.data;
}
