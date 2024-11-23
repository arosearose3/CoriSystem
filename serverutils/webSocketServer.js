// WebSocketServer.js
import { WebSocketServer } from 'ws';
import { createLogger } from '../routes/EventProcessor/logger.js';

export class WebSocketManager {
  constructor(server, logger) {
    this.wss = new WebSocketServer({ server }); // Attach to HTTPS server
    this.logger = logger || createLogger({
      service: 'websocket-manager',
      level: process.env.LOG_LEVEL || 'debug',
    });
    this.clients = new Map(); // Store client connections
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      this.logger.error('WebSocket server error:', error);
    });

    // Periodically check for stale connections
    setInterval(() => this.pingConnections(), 30000);
  }

  handleConnection(ws, req) {
    const userId = this.getUserIdFromRequest(req);

    if (!userId) {
      ws.close(1008, 'Authentication required');
      return;
    }

    this.clients.set(userId, {
      ws,
      lastPing: Date.now(),
      subscriptions: new Set(),
    });

    this.logger.info(`Client connected: ${userId}`);

    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => this.handleMessage(userId, data));
    ws.on('close', () => this.handleDisconnect(userId));

    this.sendToClient(userId, {
      type: 'connection',
      status: 'connected',
      timestamp: new Date().toISOString(),
    });
  }

  getUserIdFromRequest(req) {
    // Extract user ID from session or authentication token
    return req.session?.user?.id || null;
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
        message: 'Invalid message format',
      });
    }
  }

  handleSubscribe(userId, message) {
    const client = this.clients.get(userId);
    if (client) {
      client.subscriptions.add(message.resource);
      this.sendToClient(userId, {
        type: 'subscribed',
        resource: message.resource,
      });
    }
  }

  handleUnsubscribe(userId, message) {
    const client = this.clients.get(userId);
    if (client) {
      client.subscriptions.delete(message.resource);
      this.sendToClient(userId, {
        type: 'unsubscribed',
        resource: message.resource,
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

  sendToClient(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  broadcast(message, filter = null) {
    this.clients.forEach((client, userId) => {
      if (!filter || filter(userId, client)) {
        this.sendToClient(userId, message);
      }
    });
  }

  notifySubscribers(resource, message) {
    this.clients.forEach((client, userId) => {
      if (client.subscriptions.has(resource)) {
        this.sendToClient(userId, {
          type: 'update',
          resource,
          data: message,
        });
      }
    });
  }
}
