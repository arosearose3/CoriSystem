export class EventProcessor {
    constructor(config) {
        this.planLoader = config.planLoader;
        this.eventListener = config.eventListener;
        this.activityExecutor = config.activityExecutor;
        this.initialized = false;
    }

    async initialize() {
        console.log('EventProcessor: initialize called');
        return false;
    }

    setWebSocketManager(wsManager) {
        console.log('EventProcessor: setWebSocketManager called');
        return false;
    }

    async handleEvent(eventDef, data) {
        console.log('EventProcessor: handleEvent called');
        return false;
    }
}