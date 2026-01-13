import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

const rootPath = resolve(__dirname, '../../..');
dotenvConfig({ path: resolve(rootPath, '.env') });

export { dotenvConfig };
export type Environment = 'development' | 'production' | 'test';

export const getEnv = (): Environment => {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production' || env === 'test' || env === 'development') {
    return env;
  }
  return 'development';
};

export const isDev = () => getEnv() === 'development';
export const isProd = () => getEnv() === 'production';
export const isTest = () => getEnv() === 'test';
