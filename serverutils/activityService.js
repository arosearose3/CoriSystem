// Activity Service Base - handles CRUD operations with FHIR server
class FHIRServiceBase {
    constructor(resourceType) {
      this.resourceType = resourceType;
    }
  
    async create(data) {
      try {
        const response = await fetch(`/api/${this.resourceType}/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        return await response.json();
      } catch (error) {
        console.error(`${this.resourceType} creation failed:`, error);
        throw error;
      }
    }
  
    async update(id, data) {
      try {
        const response = await fetch(`/api/${this.resourceType}/update/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        return await response.json();
      } catch (error) {
        console.error(`${this.resourceType} update failed:`, error);
        throw error;
      }
    }
  
    async getById(id) {
      try {
        const response = await fetch(`/api/${this.resourceType}/${id}`);
        return await response.json();
      } catch (error) {
        console.error(`${this.resourceType} fetch failed:`, error);
        throw error;
      }
    }
  
    async delete(id) {
      try {
        const response = await fetch(`/api/${this.resourceType}/${id}`, {
          method: 'DELETE'
        });
        return await response.json();
      } catch (error) {
        console.error(`${this.resourceType} deletion failed:`, error);
        throw error;
      }
    }
  }
  
  /**
   * Form & Assessment Activities
   */
  class FormAssessmentService extends FHIRServiceBase {
    constructor() {
      super('Questionnaire');
    }
  
    async sendQuestionnaire(questionnaire, patientContact, context = {}) {
      try {
        // Create Communication resource
        const communicationService = new FHIRServiceBase('Communication');
        const communication = await communicationService.create({
          resourceType: 'Communication',
          status: 'preparation',
          recipient: [{ identifier: { value: patientContact } }],
          payload: [{
            contentReference: { reference: `Questionnaire/${questionnaire.id}` }
          }]
        });
  
        // Create Task to track questionnaire delivery
        const taskService = new FHIRServiceBase('Task');
        const deliveryTask = await taskService.create({
          resourceType: 'Task',
          status: 'requested',
          intent: 'order',
          code: {
            coding: [{
              system: 'https://combinebh.org/fhir/task-type',
              code: 'send-questionnaire'
            }]
          },
          input: [{
            type: { text: 'questionnaire' },
            valueReference: { reference: `Questionnaire/${questionnaire.id}` }
          }],
          output: [{
            type: { text: 'communication' },
            valueReference: { reference: `Communication/${communication.id}` }
          }]
        });
  
        return { deliveryTask, communication };
      } catch (error) {
        console.error('SendQuestionnaire failed:', error);
        throw error;
      }
    }
  
    // TODO: Implement QuestionnaireResponse processing
    // Need to add custom endpoints for:
    // - Extracting answers
    // - Creating Observations
    // - Creating Conditions based on responses
    async processQuestionnaireResponse(response) {
      // This needs custom implementation beyond basic CRUD
      throw new Error('Not implemented');
    }
  }
  
  /**
   * Communication Activities
   */
  class CommunicationService extends FHIRServiceBase {
    constructor() {
      super('Communication');
    }
  
    async sendNotification(recipient, content, context = {}) {
      try {
        const communication = await this.create({
          resourceType: 'Communication',
          status: 'preparation',
          recipient: [{ identifier: { value: recipient } }],
          payload: [{ contentString: content }]
        });
  
        const taskService = new FHIRServiceBase('Task');
        const taskUpdate = await taskService.create({
          resourceType: 'Task',
          status: 'completed',
          output: [{
            type: { text: 'notification-sent' },
            valueReference: { reference: `Communication/${communication.id}` }
          }]
        });
  
        return { communication, taskUpdate };
      } catch (error) {
        console.error('SendNotification failed:', error);
        throw error;
      }
    }
  
    async recordConsent(patientId, serviceContext, consentDetails = {}) {
      const consentService = new FHIRServiceBase('Consent');
      return await consentService.create({
        resourceType: 'Consent',
        status: 'active',
        patient: { reference: `Patient/${patientId}` },
        scope: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/consentscope',
            code: 'treatment'
          }]
        },
        category: [{
          coding: [{
            system: 'https://combinebh.org/fhir/consent-type',
            code: serviceContext
          }]
        }]
      });
    }
  }
  
  /**
   * Clinical Activities
   */
  class ClinicalService {
    constructor() {
      this.serviceRequestService = new FHIRServiceBase('ServiceRequest');
      this.taskService = new FHIRServiceBase('Task');
      this.conditionService = new FHIRServiceBase('Condition');
      this.goalService = new FHIRServiceBase('Goal');
    }
  
    // TODO: Need custom endpoint for finding active service requests
    // Currently implemented in the generator but needs server-side logic
    async createReferral(patientId, serviceType, reason) {
      try {
        const serviceRequest = await this.serviceRequestService.create({
          resourceType: 'ServiceRequest',
          status: 'active',
          intent: 'order',
          subject: { reference: `Patient/${patientId}` },
          code: {
            coding: [{
              system: 'https://combinebh.org/fhir/service-types',
              code: serviceType
            }]
          },
          reasonCode: [{
            text: reason
          }]
        });
  
        const task = await this.taskService.create({
          resourceType: 'Task',
          status: 'requested',
          intent: 'order',
          focus: { reference: `ServiceRequest/${serviceRequest.id}` }
        });
  
        return { serviceRequest, task };
      } catch (error) {
        console.error('CreateReferral failed:', error);
        throw error;
      }
    }
  
    // Additional methods remain similar but use FHIRServiceBase...
  }
  
  // TODO: Implement remaining service classes using FHIRServiceBase
  // ServiceDeliveryService
  // ResourceManagementService
  // IntegrationService
  
  /**
   * Factory remains the same but instantiates updated services
   */
  class ActivityServiceFactory {
    static formAssessment = new FormAssessmentService();
    static communication = new CommunicationService();
    static clinical = new ClinicalService();
    // TODO: Implement remaining services
    
    static getService(type) {
      switch(type) {
        case 'form-assessment':
          return this.formAssessment;
        case 'communication':
          return this.communication;
        case 'clinical':
          return this.clinical;
        // TODO: Add remaining services
        default:
          throw new Error(`Unknown service type: ${type}`);
      }
    }
  }
  
  module.exports = {
    ActivityServiceFactory
  };