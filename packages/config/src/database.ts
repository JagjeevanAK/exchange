import './env';

export interface DatabaseConfig {
  url: string;
  poolMin: number;
  poolMax: number;
}

export const databaseConfig: DatabaseConfig = {
  url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5433/postgres',
  poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
  poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
};
