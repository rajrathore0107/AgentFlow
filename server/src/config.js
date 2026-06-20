import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

export default {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'agentflow-secret-key-change-in-production',
  jwtExpiresIn: '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  tavilyApiKey: process.env.TAVILY_API_KEY || '',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
};
