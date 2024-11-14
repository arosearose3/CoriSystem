// src/lib/services/timerService.ts (CLIENT VERSION)
import axios from 'axios';

export async function getAllTimers() {
  const response = await axios.get('/api/timer/all');
  return response.data;
}

export async function createTimer(timerData) {
  const response = await axios.post('/api/timer/create', timerData);
  console.log ("timerServices-client createTime response.data: ", response.data);
  return response.data;
}

export async function updateTimer(id, timerData) {
  const response = await axios.put(`/api/timer/${id}`, timerData);
  return response.data;
}

export async function deleteTimer(id, timerName) {
  console.log ("timerServices-client deleteTimer id: ", id, " timerName: ", timerName);
    const response = await axios.post(`/api/timer/delete/${id}`, {
      data: {
        timerName
      }
    });
    return response.data;
  }