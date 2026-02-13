export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode = 500,
    isOperational = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code?: string) {
    super(message, 400, true, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code?: string) {
    super(message, 401, true, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code?: string) {
    super(message, 403, true, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code?: string) {
    super(message, 404, true, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code?: string) {
    super(message, 409, true, code);
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]> | { field: string; message: string; }[];

  constructor(message: string, errors?: Record<string, string[]> | { field: string; message: string; }[]) {
    super(message, 422, true, 'VALIDATION_ERROR');
    this.errors = errors || {};
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', code?: string) {
    super(message, 429, true, code);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', code?: string) {
    super(message, 500, false, code);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', code?: string) {
    super(message, 503, true, code);
  }
}

// Error type guards
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}
