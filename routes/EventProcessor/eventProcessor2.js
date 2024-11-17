export class EventProcessor {
  constructor(callFhirApi, activityExecutor, logger) {
    this.callFhirApi = callFhirApi;
    this.activityExecutor = activityExecutor;
    this.logger = logger;

    // Storage for configurations
    this.webhookEvents = new Map();
    this.timerEvents = new Map();
    this.fhirChangeEvents = new Map();
    this.registeredPlans = new Map();

    this.initialized = false;
    this.wsManager = null;
  }

  setWebSocketManager(wsManager) {
    this.wsManager = wsManager;
    this.logger.info('WebSocket manager configured');
  }

  async initialize() {
    if (this.initialized) {
      this.logger.warn('EventProcessor already initialized');
      return;
    }

    try {
      this.logger.info('Starting EventProcessor initialization');

      // Load all configurations independently
      await Promise.all([
        this.loadEndpoints(),
        this.loadEventTemplates(),
        this.loadPlans()
      ]);

      this.initialized = true;
      this.logger.info('EventProcessor initialization complete', {
        webhookEvents: this.webhookEvents.size,
        timerEvents: this.timerEvents.size,
        fhirChangeEvents: this.fhirChangeEvents.size,
        plans: this.registeredPlans.size
      });
    } catch (error) {
      this.initialized = false;
      this.logger.error('EventProcessor initialization failed:', error);
      throw error;
    }
  }

  async loadEndpoints() {
    try {
      this.logger.info('Loading webhook endpoints');
      const response = await this.callFhirApi('GET', 'Endpoint?status=active');
      
      if (!response.entry) {
        this.logger.info('No webhook endpoints found');
        return;
      }

      for (const entry of response.entry) {
        const endpoint = entry.resource;
        if (endpoint.address?.startsWith('http://cori.system')) {
          const fullPath = endpoint.address.replace('http://cori.system', '');
          const path = fullPath.replace('/event/webhook/', '/webhook/');
          
          this.webhookEvents.set(path, {
            registrations: [],
            endpointInfo: {
              id: endpoint.id,
              name: endpoint.name,
              mimeTypes: endpoint.payloadMimeType || ['application/json'],
              status: endpoint.status,
              originalAddress: endpoint.address
            }
          });
          
          this.logger.info(`Registered webhook endpoint: ${endpoint.name}`, {
            path,
            id: endpoint.id
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to load webhook endpoints:', error);
      throw error;
    }
  }

  async loadEventTemplates() {
    try {
      this.logger.info('Loading event templates');
      const response = await this.callFhirApi('GET', 'Basic?code=event-template');
      
      if (!response.entry) {
        this.logger.info('No event templates found');
        return;
      }

      for (const entry of response.entry) {
        const template = entry.resource;
        const config = this.extractEventConfig(template);
        
        if (!config.type) continue;

        switch (config.type) {
          case 'timer':
            if (config.schedule) {
              this.timerEvents.set(config.schedule, {
                id: template.id,
                name: config.name,
                schedule: config.schedule,
                timeZone: config.timeZone
              });
              this.logger.info(`Registered timer event: ${config.name}`);
            }
            break;

          case 'data-changed':
            if (config.resourceType) {
              if (!this.fhirChangeEvents.has(config.resourceType)) {
                this.fhirChangeEvents.set(config.resourceType, []);
              }
              this.fhirChangeEvents.get(config.resourceType).push({
                id: template.id,
                name: config.name,
                operation: config.operation
              });
              this.logger.info(`Registered FHIR change event: ${config.name}`);
            }
            break;
        }
      }
    } catch (error) {
      this.logger.error('Failed to load event templates:', error);
      throw error;
    }
  }

  async loadPlans() {
    try {
      this.logger.info('Loading plans');
      const response = await this.callFhirApi('GET', 'PlanDefinition?status=active');
      
      if (!response.entry) {
        this.logger.info('No plans found');
        return;
      }

      for (const entry of response.entry) {
        const plan = entry.resource;
        this.registeredPlans.set(plan.id, plan);
      }

      this.logger.info(`Loaded ${this.registeredPlans.size} plans`);
    } catch (error) {
      this.logger.error('Failed to load plans:', error);
      throw error;
    }
  }

  // Event handlers
  async handleWebhook(path, payload, headers) {
    if (!this.initialized) throw new Error('EventProcessor not initialized');

    const eventInfo = this.webhookEvents.get(path);
    if (!eventInfo) {
      throw new Error(`Unknown webhook path: ${path}`);
    }

    const eventId = `webhook-${Date.now()}`;
    const matchingPlans = this.findMatchingPlans('webhook', path);

    for (const plan of matchingPlans) {
      try {
        await this.executePlan(plan, {
          type: 'webhook',
          path,
          payload,
          headers,
          eventId
        });
      } catch (error) {
        this.logger.error(`Failed to execute plan ${plan.id}:`, error);
      }
    }
  }

  async handleFhirChange(event) {
    if (!this.initialized) throw new Error('EventProcessor not initialized');

    const eventId = `fhir-${Date.now()}`;
    const matchingPlans = this.findMatchingPlans('data-changed', event.resourceType);

    for (const plan of matchingPlans) {
      try {
        await this.executePlan(plan, {
          type: 'data-changed',
          resourceType: event.resourceType,
          operation: event.operation,
          resource: event.resource,
          eventId
        });
      } catch (error) {
        this.logger.error(`Failed to execute plan ${plan.id}:`, error);
      }
    }
  }

  async handleTimerEvent(schedule, message) {
    if (!this.initialized) throw new Error('EventProcessor not initialized');

    const eventId = `timer-${Date.now()}`;
    const matchingPlans = this.findMatchingPlans('timer', schedule);

    for (const plan of matchingPlans) {
      try {
        await this.executePlan(plan, {
          type: 'timer',
          schedule,
          message,
          eventId
        });
      } catch (error) {
        this.logger.error(`Failed to execute plan ${plan.id}:`, error);
      }
    }
  }

  // Helper methods
  findMatchingPlans(eventType, eventKey) {
    const matchingPlans = [];

    for (const plan of this.registeredPlans.values()) {
      const trigger = plan.action?.[0]?.trigger?.[0];
      if (!trigger) continue;

      switch (eventType) {
        case 'webhook':
          if (this.webhookEvents.get(eventKey)?.endpointInfo?.name === trigger.name) {
            matchingPlans.push(plan);
          }
          break;

        case 'timer':
          if (this.timerEvents.has(eventKey) && 
              this.timerEvents.get(eventKey).id === trigger.name) {
            matchingPlans.push(plan);
          }
          break;

        case 'data-changed':
          const changes = this.fhirChangeEvents.get(eventKey) || [];
          if (changes.some(change => change.id === trigger.name)) {
            matchingPlans.push(plan);
          }
          break;
      }
    }

    return matchingPlans;
  }

  async executePlan(plan, eventData) {
    const activities = plan.action.slice(1).map(a => a.definitionCanonical);
    
    for (const activityRef of activities) {
      try {
        await this.activityExecutor.execute({
          activityRef,
          planId: plan.id,
          eventData,
          author: plan.author?.reference
        });
      } catch (error) {
        this.logger.error(`Failed to execute activity ${activityRef}:`, error);
        throw error;
      }
    }
  }

  extractEventConfig(template) {
    const mainExtension = template.extension?.[0]?.extension || [];
    return {
      name: mainExtension.find(e => e.url === 'name')?.valueString,
      description: mainExtension.find(e => e.url === 'description')?.valueString,
      type: mainExtension.find(e => e.url === 'type')?.valueString,
      schedule: mainExtension.find(e => e.url === 'schedule')?.valueString,
      timeZone: mainExtension.find(e => e.url === 'timeZone')?.valueString,
      resourceType: mainExtension.find(e => e.url === 'resourceType')?.valueString,
      operation: mainExtension.find(e => e.url === 'operation')?.valueString
    };
  }
}