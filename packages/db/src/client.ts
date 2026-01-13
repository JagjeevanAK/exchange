import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { databaseConfig } from '@exchange/config';

const pool = new Pool({ 
  connectionString: databaseConfig.url,
  min: databaseConfig.poolMin,
  max: databaseConfig.poolMax,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
export { pool };
