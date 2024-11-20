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

  getPlansDebugInfo() {
    // Debug logging to check Map state
   // console.log('Debug - Raw Map:', this.registeredPlans);
   // console.log('Debug - Map size:', this.registeredPlans.size);
   // console.log('Debug - Map keys:', Array.from(this.registeredPlans.keys()));
    
    // Check the structure of the first plan if any exist
    if (this.registeredPlans.size > 0) {
      const firstKey = Array.from(this.registeredPlans.keys())[0];
    //  console.log('Debug - Sample plan structure:', this.registeredPlans.get(firstKey));
    }
  
    const plansArray = Array.from(this.registeredPlans.entries());
    //console.log('Debug - Plans array:', plansArray);
  
    return {
      count: this.registeredPlans.size,
      plans: plansArray.map(([id, plan]) => {
        // Log each plan's transformation
    //    console.log('Debug - Processing plan:', { id, plan });
        return {
          id,
          title: plan?.title || 'Untitled',
          status: plan?.status || 'unknown',
          version: plan?.version
        };
      })
    };
  }
  
  async loadPlans() {
    try {
      this.logger.info('Loading plans');
      const response = await this.callFhirApi('GET', 'PlanDefinition?status=active');
      
      // Log the raw response
      //console.log('Debug - Raw FHIR response:', response);
      
      if (!response.entry) {
        this.logger.info('No plans found');
        return;
      }
  
      // Log entry count
      //console.log('Debug - Number of entries:', response.entry.length);
  
      this.registeredPlans.clear();
      
      for (const entry of response.entry) {
        const plan = entry.resource;
        // Log each plan before storing
       // console.log('Debug - Adding plan:', { id: plan.id, plan });
        this.registeredPlans.set(plan.id, plan);
      }
  
      // Log Map state after population
/*   //    console.log('Debug - Map after population:', {
        size: this.registeredPlans.size,
        keys: Array.from(this.registeredPlans.keys())
      }); */
  
      const plansInfo = this.getPlansDebugInfo();
      this.logger.info('Plans loaded successfully:', plansInfo?.count);
    //  console.log('Loaded plans debug info:', plansInfo);
  
    } catch (error) {
      this.logger.error('Failed to load plans:', {
        error: error.message,
        stack: error.stack
      });
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
 //   console.log ("eventProc handleWebhook, before findMatchingPlans");
    const matchingPlans = this.findMatchingPlans('webhook', path);

 //   console.log ("eventProc handleWebhook,findMatchingPlans:", matchingPlans);
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

/*  //   console.log("Debug - Webhook Events Map:", {
      eventKey,
      webhookInfo: this.webhookEvents.get(eventKey),
      allWebhooks: Array.from(this.webhookEvents.entries()).map(([key, info]) => ({
        key,
        name: info.endpointInfo.name,
        info: JSON.stringify(info.endpointInfo)
      }))
    }); */


/*   //  console.log("eventProc findMatchingPlans:", {
      eventType,
      eventKey,
      plansCount: this.registeredPlans.size,
      planIds: Array.from(this.registeredPlans.keys())
    }); */
  
    const matchingPlans = [];
    
    // Debug the plans we're iterating through
/*   //  console.log("Available plans:", Array.from(this.registeredPlans.entries()).map(([id, plan]) => ({
      id,
      triggerName: plan.action?.[0]?.trigger?.[0]?.name,
      title: plan.title
    }))); */
  
    for (const plan of this.registeredPlans.values()) {
      // Debug each plan as we process it
/*    //   console.log("Processing plan:", {
        id: plan.id,
        title: plan.title,
        hasAction: !!plan.action,
        actionCount: plan.action?.length,
        triggerName: plan.action?.[0]?.trigger?.[0]?.name
      }); */
  
      const trigger = plan.action?.[0]?.trigger?.[0];
      if (!trigger) {
    //    console.log(`Skipping plan ${plan.id} - no trigger found`);
        continue;
      }
  
      let isMatch = false;
      switch (eventType) {
        case 'webhook':
          const webhookInfo = this.webhookEvents.get(eventKey);
/*       //    console.log("Webhook comparison:", {
            planTriggerName: trigger.name,
            webhookName: webhookInfo?.endpointInfo?.name,
            isMatch: webhookInfo?.endpointInfo?.name === trigger.name
          }); */
          if (webhookInfo?.endpointInfo?.id === trigger.name) {
            isMatch = true;
          }
          break;
  
        case 'timer':
          const timerInfo = this.timerEvents.get(eventKey);
/*      //     console.log("Timer comparison:", {
            planTriggerName: trigger.name,
            timerId: timerInfo?.id,
            isMatch: timerInfo?.id === trigger.name
          }); */
          if (timerInfo?.id === trigger.name) {
            isMatch = true;
          }
          break;
  
        case 'data-changed':
          const changes = this.fhirChangeEvents.get(eventKey) || [];
/*       //    console.log("Data change comparison:", {
            planTriggerName: trigger.name,
            changes: changes.map(c => c.id),
            hasMatch: changes.some(change => change.id === trigger.name)
          }); */
          if (changes.some(change => change.id === trigger.name)) {
            isMatch = true;
          }
          break;
      }
  
      if (isMatch) {
    //    console.log(`Match found for plan ${plan.id}`);
        matchingPlans.push(plan);
      }
    }
  
    console.log("Matching plans found:", matchingPlans.map(p => ({
      id: p.id,
      title: p.title
    })));
  
    return matchingPlans;
  }

  async executePlan(plan, eventData) {
    console.log("executePlan params:", {
      planId: plan.id,
      planTitle: plan.title,
      eventDataPath: eventData?.path
    });
  
    // Get trigger information from first action
    const triggerAction = plan.action[0];
    const triggerEvent = {
      type: triggerAction?.trigger?.[0]?.type,
      name: triggerAction?.trigger?.[0]?.name
    };
  
    // Get activities from remaining actions
    const activities = plan.action.slice(1).map(a => a.definitionCanonical);
  
    for (const activityRef of activities) {
      try {
        await this.activityExecutor.execute({
          activityRef,
          planId: plan.id,
          triggerEvent,  // Pass the trigger event info
          eventData,
          author: plan.author?.reference
        });
      } catch (error) {
        this.logger.error(`Failed to execute activity ${activityRef}:`, {
          error: error.message,
          planId: plan.id,
          activityRef
        });
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