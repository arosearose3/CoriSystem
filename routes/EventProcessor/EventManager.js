// eventManager.js
import { PubSub } from '@google-cloud/pubsub';
import { CloudSchedulerClient } from '@google-cloud/scheduler';
import { BASE_PATH } from '../../serverutils.js';


export class EventManager {
    constructor(fhirClient, taskManager, planLoader, activityExecutor, app) {
        this.fhirClient = fhirClient;
        this.taskManager = taskManager;
        this.planLoader = planLoader;
        this.activityExecutor = activityExecutor;
        this.app = app; //reference to express server
        
        // Track active event registrations
        this.webhookEvents = new Map();  // path -> EventDefinition
        this.scheduledEvents = new Map(); // jobId -> EventDefinition
        this.fhirSubscriptions = new Map(); // resourceType -> EventDefinition[]

        // Initialize Google clients, turned off for now Dec 14
     //   this.pubsub = new PubSub();
     //   this.scheduler = new CloudSchedulerClient();
          this.pubsub = null;
          this.scheduler = null;  

          this.taskManager.onTaskCreated = async (task, planDefinition) => {
            for (const action of planDefinition.action || []) {
                if (action.trigger) {
                    for (const trigger of action.trigger) {
                        if (trigger.type === 'named-event') {
                            const eventDef = {
                                resourceType: 'EventDefinition',
                                status: 'active',
                                name: trigger.name,
                                trigger: [trigger]
                            };
                            await this.fhirClient.create(eventDef);
                            await this.registerEvent(eventDef);
                        }
                    }
                }
            }
        };
        this.app.post(`${BASE_PATH}/api/webhook/:webhookId`, this.validateWebhook.bind(this), this.handleWebhook.bind(this));
    }

    async handleWebhook(req, res) {
        try {
            const task = await this.processEvent(req.webhookEvent, {
                type: 'webhook',
                data: req.body,
                path: req.params.webhookId
            });
    
            res.status(200).json({
                message: 'Workflow executed',
                taskId: task.id
            });
        } catch (error) {
            console.error('Webhook handling failed:', error);
            res.status(400).json({
                error: error.message,
                details: error.stack
            });
        }
    }
    
    async validateWebhook(req, res, next) {
        const { webhookId } = req.params;
        console.log('Webhook endpoint hit:', webhookId);
        
        try {
            const cleanId = webhookId.replace(/^webhook\//, '');
            console.log('Cleaned webhook ID:', cleanId);
    
            const hasWebhook = this.webhookEvents.has(cleanId) || 
                              this.webhookEvents.has(`webhook/${cleanId}`);
    
            if (!hasWebhook) {
                console.log('No registered webhook found for:', webhookId);
                return res.status(404).json({
                    error: 'No registered webhook found',
                    webhook: webhookId
                });
            }
    
            req.webhookEvent = this.webhookEvents.get(cleanId);
            next();
        } catch (error) {
            console.error('Error processing webhook:', error);
            return res.status(500).json({
                error: 'Internal server error',
                details: error.message
            });
        }
    }

    /**
     * Main initialization method - loads all active EventDefinitions
     * and sets up their triggers
     */
    async initialize() {
        try {
            await this.cleanupDuplicateEvents();

            // Load all active EventDefinitions from FHIR
            const events = await this.loadEventDefinitions();

            console.log(`EventMgr: Loaded ${events.length} active events`);
            console.log(events);

            for (const eventDef of events) {
                await this.registerEvent(eventDef);
            }
            //  Start listening for FHIR changes - disabled for now Dec 14
            //  await this.setupFhirSubscriptions();

            const allPlansLoaded = await this.planLoader.loadAllPlans();
            if (!allPlansLoaded) {
                console.warn('No plans were loaded. Check if PlanDefinitions exist in the FHIR store.');
            }


            const valid = this.planLoader.validatePlanHierarchy();
            if (!valid) {
                console.error('Plan hierarchy validation failed. Some workflows may not execute properly.');
            }

            //    Build a trigger-to-plan map
            //    The PlanLoader should inspect all loaded PlanDefinitions and find which have
            //    action triggers matching the event triggers we registered above.
            this.planLoader.buildTriggerToPlanMap();
     } 
     catch (error) {
            throw new Error(`Event initialization failed: ${error.message}`);
        }
    }

    async cleanupDuplicateEvents() {
        try {
            const response = await this.fhirClient.search('EventDefinition', {
                status: 'active'
            });
            
            const events = response.entry?.map(e => e.resource) || [];
            const pathMap = new Map();
            const toDelete = [];
    
            // Group events by path and identify duplicates
            events.forEach(event => {
                const path = event.name;
                if (!pathMap.has(path)) {
                    pathMap.set(path, []);
                }
                pathMap.get(path).push(event);
            });
    
            // For each path with multiple events, mark older ones for deletion
            for (const [path, eventList] of pathMap.entries()) {
                if (eventList.length > 1) {
                    // Sort by lastUpdated descending
                    eventList.sort((a, b) => 
                        new Date(b.meta.lastUpdated) - new Date(a.meta.lastUpdated)
                    );
                    
                    // Keep the most recent, mark others for deletion
                    const toRemove = eventList.slice(1);
                    toDelete.push(...toRemove);
                    
                    console.log(`Marking ${toRemove.length} duplicate events for cleanup for path ${path}`);
                }
            }
    
            // Delete the older duplicates
            for (const event of toDelete) {
                try {
                    await this.fhirClient.delete('EventDefinition', event.id);
                    console.log(`Cleaned up duplicate EventDefinition: ${event.id}`);
                } catch (error) {
                    console.error(`Failed to delete duplicate EventDefinition ${event.id}:`, error);
                }
            }
    
            console.log(`Cleanup complete: removed ${toDelete.length} duplicate events`);
            
        } catch (error) {
            console.error('Failed to cleanup duplicate events:', error);
        }
    }
    /**
     * Loads all active EventDefinitions from the FHIR store
     */
    async loadEventDefinitions() {
        try {
            const response = await this.fhirClient.search('EventDefinition', {
                status: 'active'
            });
            
            const events = response.entry?.map(e => e.resource) || [];
            
            // Create a map to track unique paths
            const uniqueEvents = new Map();
            
            // Process events keeping only the most recent for each path
            events.forEach(event => {
                const path = event.name;
                const currentEvent = uniqueEvents.get(path);
                
                // If no event for this path exists, or this one is newer
                if (!currentEvent || 
                    (new Date(event.meta.lastUpdated) > new Date(currentEvent.meta.lastUpdated))) {
                    uniqueEvents.set(path, event);
                    
                    // If we're replacing an older event, mark it for cleanup
                    if (currentEvent) {
                        console.log(`Found duplicate event for path ${path}, using newer version:`, {
                            oldId: currentEvent.id,
                            newId: event.id,
                            path: path
                        });
                    }
                }
            });
            
            // Return only the unique, most recent events
            const uniqueEventArray = Array.from(uniqueEvents.values());
            console.log(`Loaded ${uniqueEventArray.length} unique active events (filtered from ${events.length} total)`);
            
            return uniqueEventArray;
            
        } catch (error) {
            console.error('Failed to load EventDefinitions:', error);
            throw new Error(`Event loading failed: ${error.message}`);
        }
    }

    /**
     * Registers a single EventDefinition based on its trigger type
     */
    async registerEvent(eventDef) {
        console.log ("eventMgr, registerEvent: ", JSON.stringify(eventDef));
        // Each trigger in the array is an OR condition
        for (const trigger of eventDef.trigger) {
            switch (trigger.type) {
                case 'named-event':
                    console.log ("eventMgr, registerEvent, named-event, trigger: ", JSON.stringify(trigger));
                    await this.setupWebhookEndpoint(eventDef, trigger);
                    break;

                case 'periodic':
                 //   await this.setupScheduledEvent(eventDef, trigger);
                    break;

                case 'data-changed':
                 //   await this.registerFhirChange(eventDef, trigger);
                    break;

                default:
                    throw new Error(`Unknown trigger type: ${trigger.type}`);
            }
        }
    }

    /**
     * Sets up a webhook endpoint for a named event
     */
    async setupWebhookEndpoint(eventDef, trigger) {
        // 1. Normalize path - remove any leading api/
        const cleanPath = trigger.name.replace(/^api\//, '').replace(/^webhook\//, '');
        console.log(`EventMgr: Setting up webhook endpoint for ${BASE_PATH}/api/webhook/${cleanPath}`);
            
        // 2. Store in map using normalized path
        this.webhookEvents.set(cleanPath, eventDef);
    
        // 3. Register the route with express using BASE_PATH and normalized path
        this.app.post(`${BASE_PATH}/api/webhook/${cleanPath}`, async (req, res) => {
            try {
                console.log('Webhook request received:', {
                    path: cleanPath,
                    body: req.body,
                    contentType: req.headers['content-type']
                });
        
/*                 if (!req.body || Object.keys(req.body).length === 0) {
                    console.error('Empty or missing request body');
                    return res.status(400).json({
                        error: 'Valid JSON request body is required'
                    });
                } */
    
                console.log(`Webhook received for ${cleanPath}:`, req.body);
    
                const task = await this.processEvent(eventDef, {
                    type: 'webhook',
                    data: req.body,
                    path: cleanPath
                });
    
                console.log('Task created:', task);
    
                res.status(200).json({
                    message: 'Workflow executed',
                    taskId: task.id
                });
    
            } catch (error) {
                console.error(`Webhook ${cleanPath} failed:`, {
                    error: error.message,
                    stack: error.stack
                });
                res.status(400).json({
                    error: error.message,
                    details: error.stack
                });
            }
        });
    }

    /**
     * Sets up a scheduled job in Google Cloud Scheduler
     */
    async setupScheduledEvent(eventDef, trigger) {
        const jobId = `event-${eventDef.id}`;
        let schedule;

        if (trigger.timingTiming) {
            // Convert FHIR timing to cron expression
            schedule = this.convertTimingToCron(trigger.timingTiming);
        } else if (trigger.timingDateTime) {
            // One-time scheduled event
            schedule = new Date(trigger.timingDateTime);
        }

        const job = {
            name: jobId,
            schedule,
            timeZone: 'UTC',
            httpTarget: {
                uri: `${process.env.BASE_URL}/api/internal/timer/${eventDef.id}`,
                httpMethod: 'POST'
            }
        };

        await this.scheduler.createJob(job);
        this.scheduledEvents.set(jobId, eventDef);
    }

    /**
     * Registers interest in FHIR resource changes
     */
    async registerFhirChange(eventDef, trigger) {
        for (const data of trigger.data) {
            const resourceType = data.type;
            
            if (!this.fhirSubscriptions.has(resourceType)) {
                this.fhirSubscriptions.set(resourceType, []);
            }
            
            this.fhirSubscriptions.get(resourceType).push(eventDef);
        }
    }

    /**
     * Sets up PubSub subscription for FHIR changes
     */
    async setupFhirSubscriptions() {
        const subscription = await this.pubsub.subscription('fhir-changes');
        
        subscription.on('message', async (message) => {
            try {
                const change = JSON.parse(message.data);
                await this.handleFhirChange(change);
                message.ack();
            } catch (error) {
                console.error('Error processing FHIR change:', error);
                message.nack();
            }
        });
    }

    /**
     * Processes a FHIR resource change notification
     */
    async handleFhirChange(change) {
        const resourceType = change.resource.resourceType;
        const events = this.fhirSubscriptions.get(resourceType) || [];

        for (const eventDef of events) {
            await this.processEvent(eventDef, {
                type: 'fhir-change',
                data: change,
                resourceType
            });
        }
    }

    async cleanupTaskWebhooks(taskId) {
        // Find any EventDefinitions created for this task
        const task = await this.fhirClient.read('Task', taskId);
        if (!task) return;
    
        // If this is a workflow task, find and cleanup its webhooks
        if (task.instantiatesCanonical?.startsWith('PlanDefinition/')) {
            const events = await this.fhirClient.search('EventDefinition', {
                'based-on': task.instantiatesCanonical
            });
    
            // Delete each EventDefinition and unregister webhook
            for (const entry of events.entry || []) {
                const eventDef = entry.resource;
                await this.unregisterEvent(eventDef);
                await this.fhirClient.delete('EventDefinition', eventDef.id);
            }
        }
    }
    
    async unregisterEvent(eventDef) {
        for (const trigger of eventDef.trigger) {
            if (trigger.type === 'named-event') {
                this.webhookEvents.delete(trigger.name);
                // Note: Express doesn't provide a way to remove routes
                // For a production system, we might need a different approach
                // like using a router per webhook that we can remove
            }
        }
    }

    // Add to EventManager class
async refreshTriggerMappings() {
        console.log('Refreshing trigger-to-plan mappings...');

        try {
            // Force reload all plans
            const allPlansLoaded = await this.planLoader.loadAllPlans();
            if (!allPlansLoaded) {
                console.warn('No plans were loaded during refresh');
                return false;
            }

            // Rebuild trigger map
            this.planLoader.buildTriggerToPlanMap();

            // Refresh webhook registrations
            const events = await this.loadEventDefinitions();
            console.log(`Found ${events.length} active events to refresh`);

            // Clear existing webhook registrations
            this.webhookEvents.clear();

            // Re-register all webhooks
            for (const eventDef of events) {
                await this.registerEvent(eventDef);
            }

            console.log('Trigger mappings refresh complete');
            return true;
        } catch (error) {
            console.error('Failed to refresh trigger mappings:', error);
            throw error;
        }
    }

    /**
     * Main event processing method - validates conditions and starts workflows
     */

// REPLACE in EventManager.js
async processEvent(eventDef, eventData) {
    try {
        console.log('Processing event:', {
            eventDef: eventDef.id,
            trigger: eventDef.trigger,
            triggerType: eventData.type,
            path: eventData.path,
            data: eventData.data
        });

        // Find matching trigger
        console.log('Searching for trigger in eventDef.trigger...');
        const trigger = eventDef.trigger.find(t => {
            console.log('Checking trigger:', t);

            const isNamedEvent = t.type === 'named-event';
            const matchesApiPath = t.name === `api/${eventData.path}`;
            const matchesPathAfterReplacement = t.name.replace(/^api\/[^/]+\//, '') === eventData.path;

            console.log('isNamedEvent:', isNamedEvent);
            console.log('matchesApiPath:', matchesApiPath);
            console.log('matchesPathAfterReplacement:', matchesPathAfterReplacement);

            return isNamedEvent && (matchesApiPath || matchesPathAfterReplacement);
        });

        console.log('Found trigger:', trigger);

        const triggerVariations = [
            eventData.path,
            `api/${eventData.path}`,
            `webhook/${eventData.path}`
        ];

        console.log('Trigger variations to test:', triggerVariations);

        let plan = null;
        for (const triggerName of triggerVariations) {
            console.log(`Testing trigger variation: ${triggerName}`);
            plan = await this.planLoader.findPlanByTriggerName(triggerName);
            if (plan) {
                console.log(`Plan found for trigger variation: ${triggerName}`);
                break;
            }
        }
        
        if (!plan) {
            console.error('Available triggers:', eventDef.trigger.map(t => t.name));
            throw new Error(`No plan found for trigger ${eventData.path}`);
        }
        
        console.log('Loaded Plan:', JSON.stringify(plan, null, 2));

        // Create parent task for this webhook execution
        const parentTask = await this.taskManager.createWebhookTask(
            plan,
            trigger,
            eventData.data || {}
        );

        console.log('Created parent task:', parentTask.id);

        // Execute activities - for Basic plans, include the triggered activity
        for (const action of plan.action || []) {
            // Skip non-ActivityDefinition actions
            if (!action.definitionCanonical?.includes('ActivityDefinition/')) {
                continue;
            }

            const activityId = action.definitionCanonical.split('/').pop();
            console.log(`Creating activity task for ${activityId}`);

            const activityDef = await this.fhirClient.read(
                'ActivityDefinition',
                activityId
            );

            console.log(`Fetched ActivityDefinition: ${activityId}`);
            console.log('ActivityDefinition:', activityDef);

            const activityTask = await this.taskManager.createActivityTask(
                parentTask.id,
                activityDef,
                eventData.data || {}
            );

            console.log('Created Activity Task:', activityTask.id);

            await this.activityExecutor.executeActivity(
                activityTask,
                {
                    event: eventData,
                    parent: parentTask
                }
            );
        }

        return parentTask;

    } catch (error) {
        console.error('Event processing failed at step:', {
            step: 'Fetching or executing activity',
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

async createWebhookTask(planDefinition, trigger, inputData = {}) {
    const task = {
        resourceType: 'Task',
        status: 'requested',
        intent: 'order',
        instantiatesCanonical: `PlanDefinition/${planDefinition.id}`,
        authoredOn: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        input: [
            {
                type: {
                    coding: [{
                        system: "http://terminology.hl7.org/CodeSystem/task-input-type",
                        code: "trigger-event"
                    }]
                },
                valueString: trigger.name
            },
            ...this.formatTaskInputs(inputData)
        ]
    };

    const savedTask = await this.fhirClient.create(task);
    
    // Just create provenance - no other resources needed
    await this.createProvenance(savedTask.id, 'basic-workflow-start', {
        planType: 'basic'
    });

    return savedTask;
  }
}