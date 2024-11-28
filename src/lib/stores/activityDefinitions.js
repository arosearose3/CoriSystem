// activityDefinitions.js - NEW FILE
import { writable } from 'svelte/store';

// Centralized activity definitions
export const activityDefinitions = {
  'send-questionnaire': {
    type: 'send-questionnaire',
    title: 'Send Questionnaire',
    properties: {
      recipientId: {
        type: 'string',
        label: 'Recipient ID',
        required: true,
        description: 'ID of the recipient'
      },
      questionnaireId: {
        type: 'string',
        label: 'Questionnaire',
        required: true,
        description: 'FHIR Questionnaire resource ID'
      },
      dueDate: {
        type: 'date',
        label: 'Due Date',
        description: 'When the questionnaire should be completed'
      }
    }
  },
  'process-response': {
    type: 'process-response',
    title: 'Process Response',
    properties: {
      responseId: {
        type: 'string',
        label: 'Response ID',
        required: true,
        description: 'ID of the QuestionnaireResponse'
      },
      processingRules: {
        type: 'select',
        label: 'Processing Rules',
        options: ['standard', 'urgent', 'custom'],
        default: 'standard'
      }
    }
  }
  // Add other activity definitions here
};

// Store for managing activity instances
export const activityInstanceStore = writable({});