export class ActivityExecutor {
    constructor(propertyResolver, config) {
        this.propertyResolver = propertyResolver;
        this.config = config;
        this.activeExecutions = new Map();
    }

    async initialize() {
        console.log('ActivityExecutor: initialize called');
        return false;
    }

    async executeActivity(task) {
        console.log('ActivityExecutor: executeActivity called');
        return false;
    }

    async cleanup() {
        console.log('ActivityExecutor: cleanup called');
        return false;
    }

    getActiveExecutions() {
        return [];
    }
}