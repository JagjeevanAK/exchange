import type { User as PrismaUser } from '../prisma/generated/prisma/client';

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  user: PrismaUser;
  token: string;
}

declare global {
  namespace Express {
    // Extend User to support both OAuth (user + token) and JWT auth (userId + email)
    interface User {
      // For OAuth callback - contains the full user object and token
      user?: PrismaUser;
      token?: string;
      // For JWT auth middleware - contains decoded JWT payload
      userId?: string;
      email?: string;
      iat?: number;
      exp?: number;
    }
  }
}
