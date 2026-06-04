import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

export default {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'agentflow-secret-key-change-in-production',
  jwtExpiresIn: '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
};
