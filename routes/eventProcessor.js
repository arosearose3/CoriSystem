// eventUtils.js
import axios from 'axios';
import { getFhirAccessToken } from '../src/lib/auth/auth.js'; // Adjust the path as needed

import { findMatchingPlans, executePlanDefinition } from './planDefinitionService.js';
import { 
  auth, 
  PROJECT_ID, 
  LOCATION, 
  DATASET_ID, 
  FHIR_STORE_ID, 
  handleBlobResponse 
} from '../serverutils.js';


const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;


export async function createAuditEvent(eventType, eventSource, status, payload) {
  const auditEvent = {
    resourceType: 'AuditEvent',
    type: {
      system: 'http://example.org/event-types',
      code: 'system-event'
    },
    subtype: [{
      system: 'http://example.org/event-subtypes',
      code: eventType
    }],
    action: 'E',
    recorded: new Date().toISOString(),
    outcome: status,
    agent: [{
      who: {
        reference: getSourceReference(eventType, eventSource)
      }
    }],
    source: {
      observer: {
        reference: 'Device/event-manager'
      }
    },
    entity: [{
      detail: [{
        type: 'payload',
        valueString: JSON.stringify(payload)
      }]
    }]
  };

  const response = await axios.post(
    `${FHIR_BASE_URL}/AuditEvent`,
    auditEvent,
    {
      headers: {
        Authorization: `Bearer ${await getFhirAccessToken()}`,
        'Content-Type': 'application/fhir+json'
      }
    }
  );

  return response.data;
}


export function getSourceReference(eventType, eventSource) {
  switch (eventType) {
    case 'subscription':
      return `Subscription/${eventSource}`;
    case 'webhook':
      return `Endpoint/${eventSource}`;
    case 'timer':
      return `Basic/${eventSource}`;
    default:
      return `Unknown/${eventSource}`;
  }
}

export async function validateEventSource(eventType, eventSource) {
  try {
    const accessToken = await getFhirAccessToken();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/fhir+json'
    };

    switch (eventType) {
      case 'subscription':
        await axios.get(`${FHIR_BASE_URL}/Subscription/${eventSource}`, { headers });
        break;
      case 'webhook':
        await axios.get(`${FHIR_BASE_URL}/Endpoint/${eventSource}`, { headers });
        break;
      case 'timer':
        await axios.get(`${FHIR_BASE_URL}/Basic/${eventSource}`, { headers });
        break;
      default:
        return { isValid: false, error: 'Unknown event type' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: error.response?.status === 404 ? 
        'Event source not found' : error.message 
    };
  }
}


class PriorityQueue {
  constructor() {
    this.queue = [];
  }

  enqueue(item, priority) {
    this.queue.push({ item, priority });
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  dequeue() {
    if (this.isEmpty()) return null;
    return this.queue.shift().item;
  }

  isEmpty() {
    return this.queue.length === 0;
  }
}



export class EventManager {
  constructor() {
    this.eventQueue = new PriorityQueue();
    this.processingMap = new Map();
    this.retryConfig = {
      maxAttempts: 3,
      backoffMs: 1000,
      maxBackoffMs: 60000
    };
  }

  async handleEvent(eventType, eventSource, payload) {
    // Validate event source first
    const validation = await validateEventSource(eventType, eventSource);
    if (!validation.isValid) {
      throw new Error(`Invalid event source: ${validation.error}`);
    }

    // Create initial audit event
    const auditEvent = await this.createAuditEvent({
      eventType,
      eventSource,
      payload,
      status: 'pending'
    });

    // Create tracking task
    const task = await this.createTrackingTask({
      eventType,
      eventSource,
      auditEventId: auditEvent.id
    });

    // Queue event for processing
    const priority = this.calculatePriority(eventType, payload);
    await this.queueEvent({
      auditEventId: auditEvent.id,
      taskId: task.id,
      eventType,
      eventSource,
      payload,
      priority
    });

    return {
      auditEventId: auditEvent.id,
      taskId: task.id,
      status: 'queued'
    };
  }

    calculatePriority(eventType, payload) {
    switch (eventType) {
      case 'subscription':
        return 10; // Highest priority
      case 'webhook':
        return 5;  // Medium priority
      case 'timer':
        return 1;  // Lowest priority
      default:
        return 0;
    }
  }

    async createAuditEvent({ eventType, eventSource, payload, status }) {
    const auditEvent = {
      resourceType: 'AuditEvent',
      type: {
        system: 'http://example.org/event-types',
        code: 'system-event'
      },
      subtype: [{
        system: 'http://example.org/event-subtypes',
        code: eventType
      }],
      action: 'E',
      recorded: new Date().toISOString(),
      outcome: status,
      agent: [{
        who: {
          reference: getSourceReference(eventType, eventSource)
        }
      }],
      source: {
        observer: {
          reference: 'Device/event-manager'
        }
      },
      entity: [{
        detail: [{
          type: 'payload',
          valueString: JSON.stringify(payload)
        }]
      }]
    };

    const response = await axios.post(
      `${FHIR_BASE_URL}/AuditEvent`,
      auditEvent,
      {
        headers: {
          Authorization: `Bearer ${await getFhirAccessToken()}`,
          'Content-Type': 'application/fhir+json'
        }
      }
    );

    return response.data;
  }

    async createTrackingTask({ eventType, eventSource, auditEventId }) {
    const task = {
      resourceType: 'Task',
      status: 'requested',
      intent: 'order',
      code: {
        coding: [{
          system: 'http://example.org/task-types',
          code: 'event-processing'
        }]
      },
      focus: {
        reference: `AuditEvent/${auditEventId}`
      },
      for: {
        reference: getSourceReference(eventType, eventSource)
      },
      authoredOn: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      extension: [{
        url: 'http://example.org/event-tracking',
        extension: [{
          url: 'attempts',
          valueInteger: 0
        }, {
          url: 'nextAttempt',
          valueDateTime: new Date().toISOString()
        }]
      }]
    };

    const response = await axios.post(
      `${FHIR_BASE_URL}/Task`,
      task,
      {
        headers: {
          Authorization: `Bearer ${await getFhirAccessToken()}`,
          'Content-Type': 'application/fhir+json'
        }
      }
    );

    return response.data;
  }

    async queueEvent(eventData) {
    this.eventQueue.enqueue(eventData, eventData.priority);
    await this.startProcessing();
  }

    async startProcessing() {
    while (!this.eventQueue.isEmpty()) {
      const eventData = this.eventQueue.dequeue();
      if (this.processingMap.has(eventData.auditEventId)) {
        continue; // Skip if already processing
      }

      this.processingMap.set(eventData.auditEventId, true);
      try {
        await this.processEvent(eventData);
      } finally {
        this.processingMap.delete(eventData.auditEventId);
      }
    }
  }

    async processEvent(eventData) {
    try {
      await this.updateEventStatus(eventData.auditEventId, 'in-progress');

      // Find matching plans
      const plans = await findMatchingPlans(
        eventData.eventType,
        eventData.eventSource
      );

      // Execute each plan
      for (const plan of plans) {
        await executePlanDefinition(plan, {
          eventType: eventData.eventType,
          eventSource: eventData.eventSource,
          payload: eventData.payload,
          auditEventId: eventData.auditEventId
        });
      }

      await this.updateEventStatus(eventData.auditEventId, 'complete');

    } catch (error) {
      await this.handleProcessingError(eventData, error);
    }
  }

    async handleProcessingError(eventData, error) {
    const attempts = await this.incrementAttempts(eventData.taskId);
    
    if (attempts < this.retryConfig.maxAttempts) {
      // Calculate backoff time
      const backoff = Math.min(
        this.retryConfig.backoffMs * Math.pow(2, attempts),
        this.retryConfig.maxBackoffMs
      );
      
      // Requeue with backoff
      setTimeout(() => {
        this.queueEvent({
          ...eventData,
          priority: eventData.priority - 1 // Lower priority for retries
        });
      }, backoff);

      await this.updateEventStatus(
        eventData.auditEventId,
        'waiting',
        `Retry ${attempts + 1} scheduled in ${backoff}ms`
      );
    } else {
      await this.updateEventStatus(
        eventData.auditEventId,
        'error',
        error.message
      );
    }
  }

    async updateEventStatus(auditEventId, status, details = null) {
    const update = [{
      op: 'replace',
      path: '/outcome',
      value: status
    }];

    if (details) {
      update.push({
        op: 'replace',
        path: '/outcomeDesc',
        value: details
      });
    }

    await axios.patch(
      `${FHIR_BASE_URL}/AuditEvent/${auditEventId}`,
      update,
      {
        headers: {
          Authorization: `Bearer ${await getFhirAccessToken()}`,
          'Content-Type': 'application/json-patch+json'
        }
      }
    );
  }

    async incrementAttempts(taskId) {
    const response = await axios.get(
      `${FHIR_BASE_URL}/Task/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${await getFhirAccessToken()}`,
          Accept: 'application/fhir+json'
        }
      }
    );

    const task = response.data;
    const attempts = task.extension?.[0]?.extension?.find(
      e => e.url === 'attempts'
    )?.valueInteger ?? 0;

    const update = [{
      op: 'replace',
      path: '/extension/0/extension/0/valueInteger',
      value: attempts + 1
    }];

    await axios.patch(
      `${FHIR_BASE_URL}/Task/${taskId}`,
      update,
      {
        headers: {
          Authorization: `Bearer ${await getFhirAccessToken()}`,
          'Content-Type': 'application/json-patch+json'
        }
      }
    );

    return attempts + 1;
  }
}

// Export everything that needs to be accessible
export default {
  EventManager,
  createAuditEvent,
  validateEventSource,
  getSourceReference
};
