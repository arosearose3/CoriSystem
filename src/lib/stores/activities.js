import { readable } from 'svelte/store';

export const atomicActivities = readable([
  {
    id: 'send-questionnaire',
    name: 'Send Questionnaire',
    category: 'assessment',
    inputs: ['questionnaireId', 'patientId'],
    outputs: ['taskId']
  },
  {
    id: 'process-response',
    name: 'Process Response',
    category: 'assessment',
    inputs: ['responseId'],
    outputs: ['observations', 'conditions']
  },
  // ... other atomic activities
]);