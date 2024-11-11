
export class EventProcessor {
  constructor(callFhirApi, activityExecutor, logger) {
    this.callFhirApi = callFhirApi;
    this.activityExecutor = activityExecutor;
    this.logger = logger;
    
    this.fhirChangeEvents = new Map();
    this.pubSubEvents = new Map();
    this.initialized = false;
    this.initializationError = null;
  }
  
    async initialize() {
      try {
        // Load all plan instances
        const response = await this.callFhirApi('GET', '/PlanDefinition', {
          params: {
            usage: 'cori-plan-instance',
            status: 'active'
          }
        });
  
        const plans = response.entry?.map(e => e.resource) || [];
  
        for (const plan of plans) {
          await this.registerPlan(plan);
        }
  
        this.initialized = true;
        this.logger.info('EventProcessor initialized successfully');
      } catch (error) {
        this.initializationError = error;
        this.logger.error('Failed to initialize EventProcessor:', error);
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
  
        // Get event template
        const eventTemplate = await this.callFhirApi(
          'GET',
          `/Basic/${trigger.name}`
        );
  
        // Extract config from event template extensions
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
  
        // Register based on event type
        switch (config.type) {
          case 'data-changed':
            this.registerFhirChangeEvent(config.resourceType, registration);
            break;
          case 'pubsub':
            this.registerPubSubEvent(config.subscriptionName, registration);
            break;
          default:
            this.logger.warn(`Unknown event type: ${config.type}`);
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
  
    registerPubSubEvent(subscriptionName, registration) {
      if (!this.pubSubEvents.has(subscriptionName)) {
        this.pubSubEvents.set(subscriptionName, []);
      }
      this.pubSubEvents.get(subscriptionName).push(registration);
      this.logger.info(`Registered PubSub event for subscription ${subscriptionName}`);
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
  
    async handlePubSubEvent(message) {
      if (!this.initialized) {
        throw new Error('EventProcessor not initialized');
      }
  
      try {
        // PubSub messages come with subscription name in attributes
        const subscriptionName = message.attributes?.subscription;
        if (!subscriptionName) {
          this.logger.warn('PubSub message missing subscription name', message);
          return;
        }
  
        const registrations = this.pubSubEvents.get(subscriptionName) || [];
        this.logger.info(`Processing PubSub event for subscription ${subscriptionName}`);
  
        for (const registration of registrations) {
          await this.executeActivities(registration, {
            type: 'pubsub',
            subscription: subscriptionName,
            message: message.data,
            attributes: message.attributes,
            publishTime: message.publishTime
          });
        }
      } catch (error) {
        this.logger.error('Error processing PubSub message:', error);
        throw error;
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
      // Extract configuration from event template extensions
      const mainExtension = eventTemplate.extension?.[0]?.extension || [];
      return {
        type: mainExtension.find(e => e.url === 'type')?.valueString,
        resourceType: mainExtension.find(e => e.url === 'resourceType')?.valueString,
        operation: mainExtension.find(e => e.url === 'operation')?.valueString,
        subscriptionName: mainExtension.find(e => e.url === 'subscriptionName')?.valueString
      };
    }
  }
  
  
    async function setupEventProcessor(app) {
    const processor = new EventProcessor(
      fhirClient,
      activityExecutor,
      logger
    );
  
    await processor.initialize();
  
    // Handle FHIR subscription events
    fhirSubscriptionHandler.on('change', async (event) => {
      await processor.handleFhirChange({
        resourceType: event.resource.resourceType,
        operation: event.operation,
        resourceId: event.resource.id,
        data: event.resource
      });
    });
  
    // Handle PubSub push messages
    app.post('/pubsub/push', express.json(), async (req, res) => {
      try {
        const message = req.body.message;
        await processor.handlePubSubEvent(message);
        res.status(204).send();
      } catch (error) {
        logger.error('Error handling PubSub message:', error);
        res.status(500).send('Internal Server Error');
      }
    });
  
    return processor;
  }
  


