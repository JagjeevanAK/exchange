import bcrypt from 'bcryptjs';
import { configDotenv } from 'dotenv';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prsimaClient';

configDotenv();

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'jwt-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh-key';
const isProduction = process.env.NODE_ENV === 'production';

// Cookie options
const accessTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('strict' as const) : ('lax' as const),
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/',
};

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('strict' as const) : ('lax' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({
        message: 'Email and Password are required',
      });
    }

    const dbData = await prisma.user.findUnique({
      where: { email },
    });

    if (!dbData) {
      return res.status(403).json({
        message: 'Incorrect credentials',
      });
    }

    const isMatch = await bcrypt.compare(password, dbData.password);

    if (!isMatch) {
      return res.status(403).json({
        message: 'Incorrect credentials',
      });
    }

    // Create access token (short-lived)
    const accessToken = jwt.sign(
      {
        userId: dbData.id,
        email: dbData.email,
      },
      JWT_SECRET,
      {
        expiresIn: '15m',
      }
    );

    // Create refresh token (long-lived)
    const refreshToken = jwt.sign(
      {
        userId: dbData.id,
        email: dbData.email,
      },
      REFRESH_SECRET,
      {
        expiresIn: '7d',
      }
    );

    // Set cookies
    res.cookie('accessToken', accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    res.status(200).json({
      message: 'Signed in successfully',
      token: accessToken, // Also send in response for backward compatibility
      user: {
        id: dbData.id,
        email: dbData.email,
      },
    });
  } catch (e) {
    console.error('Signin error: ', e);
    res.status(500).json({
      message: 'Internal server issue',
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: 'No refresh token provided',
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string; email: string };

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({
        message: 'User not found',
      });
    }

    // Create new access token
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: '15m',
      }
    );

    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, accessTokenCookieOptions);

    res.status(200).json({
      message: 'Token refreshed successfully',
      token: newAccessToken,
    });
  } catch (e) {
    console.error('Refresh token error: ', e);
    // Clear cookies on error
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(401).json({
      message: 'Invalid refresh token',
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
  res.status(200).json({
    message: 'Logged out successfully',
  });
});

// Check auth status endpoint
router.get('/me', async (req, res) => {
  try {
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        authenticated: false,
        message: 'No access token',
      });
    }

    const decoded = jwt.verify(accessToken, JWT_SECRET) as { userId: string; email: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return res.status(401).json({
        authenticated: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      authenticated: true,
      user,
    });
  } catch (e) {
    res.status(401).json({
      authenticated: false,
      message: 'Invalid token',
    });
  }
});

export default router;
