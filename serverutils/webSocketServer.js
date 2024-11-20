// WebSocketServer.js
import { WebSocketServer } from 'ws';
import { createLogger } from '../routes/EventProcessor/logger.js';

export class WebSocketManager {
  constructor(server, logger) {
    this.wss = new WebSocketServer({ server });
    this.logger = logger || createLogger({
      service: 'websocket-manager',
      level: process.env.LOG_LEVEL || 'debug'
    });
    this.clients = new Map(); // Map to store client connections
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Handle server errors
    this.wss.on('error', (error) => {
      this.logger.error('WebSocket server error:', error);
    });

    // Periodically check for stale connections
    setInterval(() => {
      this.pingConnections();
    }, 30000);
  }

  handleConnection(ws, req) {
    // Extract user information from the request
    const userId = this.getUserIdFromRequest(req);
    
    if (!userId) {
      ws.close(1008, 'Authentication required');
      return;
    }

    // Store client connection
    this.clients.set(userId, {
      ws,
      lastPing: Date.now(),
      subscriptions: new Set()
    });

    this.logger.info(`Client connected: ${userId}`);

    // Setup heartbeat
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle incoming messages
    ws.on('message', (data) => {
      this.handleMessage(userId, data);
    });

    // Handle client disconnect
    ws.on('close', () => {
      this.handleDisconnect(userId);
    });

    // Send welcome message
    this.sendToClient(userId, {
      type: 'connection',
      status: 'connected',
      timestamp: new Date().toISOString()
    });
  }

  getUserIdFromRequest(req) {
    // Extract user ID from session or token
    // This should match your existing authentication method
    if (req.session?.user?.id) {
      return req.session.user.id;
    }
    // Add additional authentication methods as needed
    return null;
  }

  handleMessage(userId, data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(userId, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(userId, message);
          break;
        case 'ping':
          this.handlePing(userId);
          break;
        default:
          this.logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
      this.sendToClient(userId, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  handleSubscribe(userId, message) {
    const client = this.clients.get(userId);
    if (client) {
      client.subscriptions.add(message.resource);
      this.sendToClient(userId, {
        type: 'subscribed',
        resource: message.resource
      });
    }
  }

  handleUnsubscribe(userId, message) {
    const client = this.clients.get(userId);
    if (client) {
      client.subscriptions.delete(message.resource);
      this.sendToClient(userId, {
        type: 'unsubscribed',
        resource: message.resource
      });
    }
  }

  handlePing(userId) {
    const client = this.clients.get(userId);
    if (client) {
      client.lastPing = Date.now();
      this.sendToClient(userId, { type: 'pong' });
    }
  }

  handleDisconnect(userId) {
    this.clients.delete(userId);
    this.logger.info(`Client disconnected: ${userId}`);
  }

  pingConnections() {
    this.wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }

  // Send message to specific client
  sendToClient(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  // Broadcast message to all clients
  broadcast(message, filter = null) {
    this.clients.forEach((client, userId) => {
      if (!filter || filter(userId, client)) {
        this.sendToClient(userId, message);
      }
    });
  }

  // Send message to subscribers of a specific resource
  notifySubscribers(resource, message) {
    this.clients.forEach((client, userId) => {
      if (client.subscriptions.has(resource)) {
        this.sendToClient(userId, {
          type: 'update',
          resource,
          data: message
        });
      }
    });
  }
}