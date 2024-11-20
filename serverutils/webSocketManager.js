// WebSocketManager.js
import { WebSocketServer } from './webSocketServer.js';

export class WebSocketManager {
  constructor(server, logger) {
    this.wss = new WebSocketServer({ server });
    this.logger = logger;
    this.clients = new Map();
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      this.logger.error('WebSocket server error:', error);
    });

    // Ping connections periodically
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  handleConnection(ws, req) {
    const userId = this.getUserIdFromRequest(req);
    
    if (!userId) {
      ws.close(1008, 'Authentication required');
      return;
    }

    this.clients.set(userId, {
      ws,
      subscriptions: new Set()
    });

    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'subscribe' && message.resource) {
          this.clients.get(userId).subscriptions.add(message.resource);
        }
      } catch (error) {
        this.logger.error('Error handling message:', error);
      }
    });

    ws.on('close', () => {
      this.clients.delete(userId);
    });
  }

  getUserIdFromRequest(req) {
    return req.session?.user?.id || null;
  }

  notifySubscribers(resource, message) {
    this.clients.forEach((client, userId) => {
      if (client.subscriptions.has(resource) && client.ws.readyState === 1) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  broadcast(message) {
    this.clients.forEach((client) => {
      if (client.ws.readyState === 1) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }
}

// server.js modifications
const server = https.createServer(httpsOptions, app);
const wsManager = new WebSocketManager(server, logger);

// Add to your event processor
if (eventProcessor) {
  eventProcessor.setWebSocketManager(wsManager);
}

// Start server
server.listen(PORT, () => {
  logger.info(`HTTPS Server running on port ${PORT}`);
});