import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { JWTPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt-key';

export const auth = (req: Request, res: Response, next: NextFunction) => {
  // First try to get token from cookie
  let token = req.cookies?.accessToken;

  // If no cookie, try Authorization header (for backward compatibility)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(403).json({
      message: 'No authorization token provided',
    });
  }

  jwt.verify(
    token,
    JWT_SECRET,
    (err: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | string | undefined) => {
      if (err) {
        return res.status(403).json({
          message: 'Invalid token',
        });
      }
      req.user = decoded as JWTPayload;
      next();
    }
  );
};
