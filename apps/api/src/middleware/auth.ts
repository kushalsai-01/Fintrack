import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { User } from '../models/index.js';
import { cacheGet, cacheSet } from '../config/redis.js';

// User interface for authenticated requests
export interface AuthUser extends TokenPayload {
  _id: string;
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token required');
    }

    const token = authHeader.split(' ')[1];

    const payload = verifyAccessToken(token);

    // Check cache first
    const cacheKey = `user:auth:${payload.userId}`;
    const cachedUser = await cacheGet<boolean>(cacheKey);

    if (cachedUser === null) {
      // Verify user exists and is active
      const user = await User.findById(payload.userId).select('_id role');

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      await cacheSet(cacheKey, true, 300); // Cache for 5 minutes
    }

    req.user = {
      ...payload,
      _id: payload.userId,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't throw if no token
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      try {
        const payload = verifyAccessToken(token);
        req.user = {
          ...payload,
          _id: payload.userId,
        };
      } catch {
        // Token invalid, continue without auth
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
};

/**
 * Require admin role
 */
export const requireAdmin = authorize('admin');

/**
 * Require premium user
 */
export const requirePremium = authorize('premium', 'admin');

/**
 * Rate limiting by user
 */
export const userRateLimit = (
  maxRequests: number,
  windowSeconds: number
) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      next();
      return;
    }

    const key = `ratelimit:user:${req.user._id}:${req.path}`;
    const current = await cacheGet<number>(key);

    if (current !== null && current >= maxRequests) {
      throw new ForbiddenError('Rate limit exceeded. Please try again later.');
    }

    await cacheSet(key, (current || 0) + 1, windowSeconds);

    next();
  };
};
