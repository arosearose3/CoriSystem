export class PlanLoader {
    constructor(fhirClient) {
        this.fhirClient = fhirClient;
        this.loadedPlans = new Map();
        this.triggerToPlan = new Map(); // Map from triggerName to corresponding PlanDefinition
    }

    /**
     * Load all PlanDefinition resources from the FHIR store.
     * @returns {boolean} - Returns true if any plans were loaded, false otherwise.
     */
   async loadAllPlans() {
          console.log('PlanLoader: loadAllPlans called');
           try {
              const response = await this.fhirClient.search('PlanDefinition', {});
              const plans = response.entry?.map(e => e.resource) || [];
              if (plans.length === 0) {
                   console.warn('No PlanDefinitions found in the FHIR store.');
                   return false;
               }
               for (const plan of plans) {
                   if (plan.id) {
                       this.loadedPlans.set(plan.id, plan);
                   }
               }
               return this.loadedPlans.size > 0;
           } catch (error) {
               console.error('Failed to load all PlanDefinitions:', error);
               return false;
           }
       }

    /**
     * Given an array of PlanDefinition references or IDs, fetch and load them into memory.
     * @param {Array<string>} planDefinitions - An array of PlanDefinition IDs to load.
     * @returns {boolean} - Returns true if any plans were loaded, false otherwise.
     */
    async loadPlans(planDefinitions) {
        console.log('PlanLoader: loadPlans called');
        if (!Array.isArray(planDefinitions) || planDefinitions.length === 0) {
            console.warn('No plan definitions provided to load.');
            return false;
        }

        let anyLoaded = false;
        for (const planId of planDefinitions) {
            try {
                const plan = await this.fhirClient.read('PlanDefinition', planId);
                this.loadedPlans.set(planId, plan);
                anyLoaded = true;
            } catch (error) {
                console.error(`Failed to load PlanDefinition/${planId}:`, error);
            }
        }
        
        console.log ("PlanLoader: anyloaded: ", anyLoaded);
        return anyLoaded;
    }

    /**
     * Determine if a given plan is "complex". 
     * A complex plan might be defined as one having nested actions.
     * @param {Object} plan - The PlanDefinition resource.
     * @returns {boolean} - True if the plan is considered complex, false otherwise.
     */
    isComplexPlan(plan) {
        console.log('PlanLoader: isComplexPlan called');
        if (!plan || !plan.action) return false;

        // Consider a plan "complex" if it has nested actions
        // For simplicity, if any action has a sub-action, we call it complex.
        return plan.action.some(a => Array.isArray(a.action) && a.action.length > 0);
    }

    /**
     * Validate the loaded plan hierarchy.
     * This might check for proper references, nested actions, or required fields.
     * @returns {boolean} - True if all loaded plans are valid, false otherwise.
     */
    validatePlanHierarchy() {
        console.log('PlanLoader: validatePlanHierarchy called');
        for (const [id, plan] of this.loadedPlans) {
            // A simple validation: ensure the plan has an ID and at least one action
            if (!plan.id || !Array.isArray(plan.action)) {
                console.error(`PlanDefinition/${id} is invalid - missing 'id' or 'action' array.`);
                return false;
            }
        }
        return true;
    }

    /**
     * Get the count of loaded plans.
     * @returns {number} - The number of plans currently loaded.
     */
    getLoadedPlanCount() {
        return this.loadedPlans.size;
    }

        /**
     * Build a mapping from trigger names to the corresponding PlanDefinitions.
     * Assumes PlanDefinitions have action[].trigger[].name fields that identify events.
     */
        buildTriggerToPlanMap() {
            console.log('PlanLoader: buildTriggerToPlanMap called');
            this.triggerToPlan.clear();
        
            for (const [id, plan] of this.loadedPlans) {
                if (!Array.isArray(plan.action)) continue;
        
                for (const action of plan.action) {
                    if (Array.isArray(action.trigger)) {
                        for (const trig of action.trigger) {
                            if (trig.name && trig.type === 'named-event') {
                                // Store both full path and cleaned path
                                const fullPath = trig.name;
                                const cleanPath = trig.name.replace(/^api\//, '');
                                
                                this.triggerToPlan.set(fullPath, plan);
                                this.triggerToPlan.set(cleanPath, plan);
                                
                                console.log(`Mapped trigger "${fullPath}" (and "${cleanPath}") -> Plan ID: ${plan.id}`);
                            }
                        }
                    }
                }
            }
        
            console.log('Trigger-to-Plan Mapping complete. Available triggers:');
            for (const triggerName of this.triggerToPlan.keys()) {
                console.log(`  - ${triggerName}`);
            }
        }
    
    /**
     * Find a PlanDefinition by a given trigger name.
     * @param {string} triggerName - The name of the trigger to look up.
     * @returns {Object|null} - The corresponding PlanDefinition or null if not found.
     */
    findPlanByTriggerName(triggerName) {
        console.log('Looking for plan with trigger:', triggerName);
        console.log('Available triggers:', Array.from(this.triggerToPlan.keys()));
    
        // Generate variations of triggerName
        const variations = new Set([
            triggerName,
            `api/${triggerName}`,
            triggerName.replace(/^api\//, ''),
        ]);
    
        console.log('Trigger variations to test:', Array.from(variations));
    
        // Check for matching plan
        for (const key of this.triggerToPlan.keys()) {
            if (variations.has(key)) {
                console.log('Matched variation:', key);
                return this.triggerToPlan.get(key);
            }
        }
    
        console.log('No matching plan found.');
        return null;
    }
    
}
