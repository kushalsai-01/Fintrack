import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors.js';

/**
 * Validation middleware factory
 * Validates request body, query, or params against a Zod schema
 */
export const validate = (
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        throw new ValidationError('Validation failed', errors);
      }

      // Replace with parsed data (includes defaults and transformations)
      req[source] = result.data;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate multiple sources at once
 */
export const validateRequest = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const allErrors: { field: string; message: string }[] = [];

      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          allErrors.push(
            ...result.error.errors.map((err) => ({
              field: `body.${err.path.join('.')}`,
              message: err.message,
            }))
          );
        } else {
          req.body = result.data;
        }
      }

      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          allErrors.push(
            ...result.error.errors.map((err) => ({
              field: `query.${err.path.join('.')}`,
              message: err.message,
            }))
          );
        } else {
          req.query = result.data;
        }
      }

      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          allErrors.push(
            ...result.error.errors.map((err) => ({
              field: `params.${err.path.join('.')}`,
              message: err.message,
            }))
          );
        } else {
          req.params = result.data;
        }
      }

      if (allErrors.length > 0) {
        throw new ValidationError('Validation failed', allErrors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
