import './env';

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigin: string;
}

export const serverConfig: ServerConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  corsOrigin:
    process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL || 'http://localhost:3000'
      : 'http://localhost:3000',
};
