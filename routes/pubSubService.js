// pubSubService.js
import { PubSub } from '@google-cloud/pubsub';

export class PubSubService {
  constructor() {
    this.pubsub = new PubSub();
  }

  async createTopic(topicName) {
    try {
      const [topic] = await this.pubsub.createTopic(topicName);
      return topic;
    } catch (error) {
      if (error.code === 6) { // ALREADY_EXISTS
        return this.pubsub.topic(topicName);
      }
      throw error;
    }
  }

  async createSubscription(topicName, subscriptionName) {
    const topic = this.pubsub.topic(topicName);
    try {
      const [subscription] = await topic.createSubscription(subscriptionName);
      return subscription;
    } catch (error) {
      if (error.code === 6) { // ALREADY_EXISTS
        return this.pubsub.subscription(subscriptionName);
      }
      throw error;
    }
  }

  async listenForMessages(subscriptionName, messageHandler) {
    const subscription = this.pubsub.subscription(subscriptionName);
    
    subscription.on('message', message => {
      messageHandler(message.data);
      message.ack();
    });

    subscription.on('error', error => {
      console.error('Pub/Sub error:', error);
    });
  }
}

// Usage in your application
const pubSubService = new PubSubService();

// Set up the notification pipeline
async function setupFHIRNotifications() {
  const topicName = 'fhir-changes';
  const subscriptionName = 'fhir-change-handler';

  // Create/get topic
  const topic = await pubSubService.createTopic(topicName);
  
  // Create/get subscription
  const subscription = await pubSubService.createSubscription(topicName, subscriptionName);
  
  // Start listening
  await pubSubService.listenForMessages(subscriptionName, async (messageData) => {
    const change = JSON.parse(messageData.toString());
    
    // Handle the FHIR resource change
    await processResourceChange(change);
  });
}