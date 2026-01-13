import './env';

export interface AuthConfig {
  jwtSecret: string;
  sessionSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  tokenExpiresIn: string;
}

export const authConfig: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
  sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
  tokenExpiresIn: process.env.TOKEN_EXPIRES_IN || '24h',
};
