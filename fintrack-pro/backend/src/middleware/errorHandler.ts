import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import config from '../config/index.js';

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    errors?: { field: string; message: string }[];
    stack?: string;
  };
}

/**
 * Not found handler - catches requests that don't match any route
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404
  );
  next(error);
};

/**
 * Global error handler
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let code: string | undefined;
  let errors: any;

  // Handle known error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;

    if (err instanceof ValidationError) {
      errors = err.errors;
    }
  }

  // Handle Mongoose errors
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';

    // Parse Mongoose validation errors
    const mongooseErrors = err as any;
    if (mongooseErrors.errors) {
      errors = Object.keys(mongooseErrors.errors).map((key) => ({
        field: key,
        message: mongooseErrors.errors[key].message,
      }));
    }
  }

  if ((err as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry';
    code = 'DUPLICATE_ENTRY';

    // Extract field from MongoDB duplicate key error
    const keyPattern = (err as any).keyPattern;
    if (keyPattern) {
      const field = Object.keys(keyPattern)[0];
      message = `${field} already exists`;
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Server error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  } else if (statusCode >= 400) {
    logger.warn('Client error:', {
      message: err.message,
      statusCode,
    });
  }

  // Build response
  const response: ErrorResponse = {
    success: false,
    error: {
      message,
      code,
      statusCode,
      errors,
    },
  };

  // Include stack trace in development
  if (config.nodeEnv === 'development') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper - catches async errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
