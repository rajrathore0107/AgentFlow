import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import config from './src/config.js';
import { initializeDatabase } from './src/db/setup.js';
import { setupWebSocket } from './src/websocket/handler.js';
import authRoutes from './src/routes/auth.js';
import pipelineRoutes from './src/routes/pipelines.js';
import executionRoutes from './src/routes/executions.js';

// Initialize database
initializeDatabase();

const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

// Middleware
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/executions', executionRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(config.port, () => {
  console.log(`\n🚀 AgentFlow Server running on http://localhost:${config.port}`);
  console.log(`📡 WebSocket available at ws://localhost:${config.port}/ws`);
  console.log(`🔧 Environment: ${config.nodeEnv}\n`);
});
