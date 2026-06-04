import jwt from 'jsonwebtoken';
import config from '../config.js';

// Store WebSocket connections mapped to execution IDs
const executionClients = new Map();
// Store WebSocket connections mapped to user IDs
const userClients = new Map();

export function setupWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    let userId = null;
    let subscribedExecutionId = null;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Authenticate
        if (message.type === 'auth') {
          try {
            const decoded = jwt.verify(message.token, config.jwtSecret);
            userId = decoded.userId;
            ws.send(JSON.stringify({ type: 'auth_success' }));

            // Track user connection
            if (!userClients.has(userId)) {
              userClients.set(userId, new Set());
            }
            userClients.get(userId).add(ws);
          } catch {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
          }
          return;
        }

        // Subscribe to execution updates
        if (message.type === 'subscribe_execution') {
          subscribedExecutionId = message.executionId;
          if (!executionClients.has(subscribedExecutionId)) {
            executionClients.set(subscribedExecutionId, new Set());
          }
          executionClients.get(subscribedExecutionId).add(ws);
          ws.send(JSON.stringify({ type: 'subscribed', executionId: subscribedExecutionId }));
          return;
        }

        // Unsubscribe from execution
        if (message.type === 'unsubscribe_execution') {
          if (subscribedExecutionId && executionClients.has(subscribedExecutionId)) {
            executionClients.get(subscribedExecutionId).delete(ws);
          }
          subscribedExecutionId = null;
          return;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Clean up connections
      if (userId && userClients.has(userId)) {
        userClients.get(userId).delete(ws);
        if (userClients.get(userId).size === 0) {
          userClients.delete(userId);
        }
      }
      if (subscribedExecutionId && executionClients.has(subscribedExecutionId)) {
        executionClients.get(subscribedExecutionId).delete(ws);
        if (executionClients.get(subscribedExecutionId).size === 0) {
          executionClients.delete(subscribedExecutionId);
        }
      }
    });
  });
}

export function broadcastToExecution(executionId, data) {
  const clients = executionClients.get(executionId);
  if (!clients) return;

  const message = JSON.stringify(data);
  clients.forEach(ws => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(message);
    }
  });
}

export function broadcastToUser(userId, data) {
  const clients = userClients.get(userId);
  if (!clients) return;

  const message = JSON.stringify(data);
  clients.forEach(ws => {
    if (ws.readyState === 1) {
      ws.send(message);
    }
  });
}
