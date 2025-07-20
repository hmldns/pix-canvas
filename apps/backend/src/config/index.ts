import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongodbUri: string;
  sentryDsn?: string;
  debug: boolean;
}

const config: Config = {
  port: parseInt(process.env.BACKEND_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pixcanvas',
  sentryDsn: process.env.SENTRY_DSN_BACKEND,
  debug: process.env.DEBUG === 'true',
};

// Validate required configuration
if (!config.mongodbUri) {
  throw new Error('MONGODB_URI environment variable is required');
}

export default config;