export class PlanLoader {
    constructor() {
        this.loadedPlans = new Map();
    }

    async loadPlans(planDefinitions) {
        console.log('PlanLoader: loadPlans called');
        return false;
    }

    isComplexPlan(plan) {
        console.log('PlanLoader: isComplexPlan called');
        return false;
    }

    validatePlanHierarchy() {
        console.log('PlanLoader: validatePlanHierarchy called');
        return false;
    }

    getLoadedPlanCount() {
        return 0;
    }
}
