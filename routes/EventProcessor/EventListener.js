export class EventListener {
    constructor(app) {
        this.registeredEndpoints = new Map();
        this.app = app;
    }

    registerEventDefinition(eventDef, handler) {
        console.log('EventListener: registerEventDefinition called');
        return false;
    }

    unregisterEventDefinition(eventDef) {
        console.log('EventListener: unregisterEventDefinition called');
        return false;
    }

    getRegisteredEndpoints() {
        return new Set();
    }

    getRegisteredEndpointCount() {
        return 0;
    }
}