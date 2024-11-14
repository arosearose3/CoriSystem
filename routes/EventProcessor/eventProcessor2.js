export class EventProcessor {
  constructor(callFhirApi, activityExecutor, logger) {
    this.callFhirApi = callFhirApi;
    this.activityExecutor = activityExecutor;
    this.logger = logger;
    
    this.fhirChangeEvents = new Map();
    this.timerEvents = new Map();
    this.webhookEvents = new Map();
    this.initialized = false;
    this.initializationError = null;
  }

  async initialize() {
    try {
      await this.loadEndpoints();
      this.initialized = true;
      this.logger.info('EventProcessor initialized successfully');
    } catch (error) {
      this.initializationError = error;
      this.logger.error('EventProcessor initialization failed:', error);
      throw error;
    }
  }

  async loadEndpoints() {
    console.log ('loadEndpoints');
    try {
      const response = await this.callFhirApi('GET', 'Endpoint?status=active', {
        params: {
          status: 'active'
        }
      });

      const endpoints = response.entry?.map(e => e.resource) || [];
      console.log ('endpoints', endpoints);

      for (const endpoint of endpoints) {
        if (endpoint.address && endpoint.address.startsWith('http://cori.system')) {
          const path = endpoint.address.replace('http://cori.system', '');
          this.webhookEvents.set(path, {
            registrations: [],
            endpointInfo: {
              id: endpoint.id,
              name: endpoint.name,
              mimeTypes: endpoint.payloadMimeType || ['application/json'],
              status: endpoint.status
            }
          });
          
          this.logger.info(`Loaded endpoint ${endpoint.name}`, {
            path,
            id: endpoint.id
          });
        }
      }

      this.logger.info(`Loaded ${this.webhookEvents.size} endpoints`);
    } catch (error) {
      this.logger.error('Failed to load endpoints:', error);
      throw error;
    }
  }

  async registerPlan(plan) {
    try {
      const trigger = plan.action[0]?.trigger?.[0];
      if (!trigger) {
        this.logger.warn(`Plan ${plan.id} has no trigger defined`);
        return;
      }

      const eventTemplate = await this.callFhirApi(
        'GET',
        `/Basic/${trigger.name}`
      );

      const config = this.extractEventConfig(eventTemplate);

      const registration = {
        planId: plan.id,
        triggerEvent: {
          name: trigger.name,
          type: trigger.type,
          config
        },
        activities: plan.action.slice(1).map(a => a.definitionCanonical),
        author: plan.author?.reference
      };

      switch (config.type) {
        case 'data-changed':
          this.registerFhirChangeEvent(config.resourceType, registration);
          break;
        case 'timer':
          this.registerTimerEvent(config.schedule, registration);
          break;
        case 'webhook':
          const endpointPath = Array.from(this.webhookEvents.entries())
            .find(([_, value]) => value.endpointInfo.name === config.endpointName)?.[0];
          
          if (endpointPath) {
            const eventInfo = this.webhookEvents.get(endpointPath);
            eventInfo.registrations.push(registration);
            this.logger.info(`Registered webhook event for path ${endpointPath}`);
          } else {
            this.logger.warn(`No matching endpoint found for ${config.endpointName}`);
          }
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to register plan ${plan.id}:`, error);
    }
  }

  registerFhirChangeEvent(resourceType, registration) {
    if (!this.fhirChangeEvents.has(resourceType)) {
      this.fhirChangeEvents.set(resourceType, []);
    }
    this.fhirChangeEvents.get(resourceType).push(registration);
    this.logger.info(`Registered FHIR change event for ${resourceType}`);
  }

  registerTimerEvent(schedule, registration) {
    if (!this.timerEvents.has(schedule)) {
      this.timerEvents.set(schedule, []);
    }
    this.timerEvents.get(schedule).push(registration);
    this.logger.info(`Registered Timer event for schedule ${schedule}`);
  }

  async handleWebhook(path, payload, headers) {
    if (!this.initialized) {
      throw new Error('EventProcessor not initialized');
    }

    const eventInfo = this.webhookEvents.get(path);
    if (!eventInfo) {
      throw new Error(`Unknown webhook path: ${path}`);
    }

    this.logger.info(`Processing webhook event for path ${path}`);

    const { registrations, endpointInfo } = eventInfo;

    if (registrations.length === 0) {
      this.logger.warn(`No registrations found for webhook path: ${path}`);
      return;
    }

    for (const registration of registrations) {
      if (endpointInfo.mimeTypes.length > 0) {
        const contentType = headers['content-type'] || 'application/json';
        if (!endpointInfo.mimeTypes.some(mime => contentType.startsWith(mime))) {
          this.logger.warn(`Invalid content type ${contentType} for endpoint ${endpointInfo.name}`);
          continue;
        }
      }

      await this.executeActivities(registration, {
        type: 'webhook',
        path,
        payload,
        endpointId: endpointInfo.id,
        endpointName: endpointInfo.name,
        timestamp: new Date().toISOString(),
        headers
      });
    }
  }

  async handleFhirChange(event) {
    if (!this.initialized) {
      throw new Error('EventProcessor not initialized');
    }

    const registrations = this.fhirChangeEvents.get(event.resourceType) || [];
    this.logger.info(`Processing FHIR change event for ${event.resourceType}`);

    for (const registration of registrations) {
      if (this.shouldProcessFhirEvent(registration, event)) {
        await this.executeActivities(registration, event);
      }
    }
  }

  async handleTimerEvent(message) {
    if (!this.initialized) {
      throw new Error('EventProcessor not initialized');
    }

    const schedule = message.attributes?.subscription;
    if (!schedule) {
      this.logger.warn('Timer message missing subscription', message);
      return;
    }

    const registrations = this.timerEvents.get(schedule) || [];
    this.logger.info(`Processing Timer event for schedule ${schedule}`);

    for (const registration of registrations) {
      await this.executeActivities(registration, {
        type: 'timer',
        schedule,
        message: message.data,
        attributes: message.attributes,
        publishTime: message.publishTime
      });
    }
  }

  shouldProcessFhirEvent(registration, event) {
    const config = registration.triggerEvent.config;
    return !config.operation || config.operation === event.operation;
  }

  async executeActivities(registration, eventData) {
    try {
      this.logger.info(`Executing activities for plan ${registration.planId}`);
      
      for (const activityRef of registration.activities) {
        await this.activityExecutor.execute({
          activityRef,
          planId: registration.planId,
          triggerEvent: registration.triggerEvent,
          eventData,
          author: registration.author
        });
      }
    } catch (error) {
      this.logger.error(`Failed to execute activities for plan ${registration.planId}:`, error);
    }
  }

  extractEventConfig(eventTemplate) {
    const mainExtension = eventTemplate.extension?.[0]?.extension || [];
    return {
      type: mainExtension.find(e => e.url === 'type')?.valueString,
      resourceType: mainExtension.find(e => e.url === 'resourceType')?.valueString,
      operation: mainExtension.find(e => e.url === 'operation')?.valueString,
      schedule: mainExtension.find(e => e.url === 'schedule')?.valueString,
      endpointName: mainExtension.find(e => e.url === 'endpointName')?.valueString
    };
  }
}