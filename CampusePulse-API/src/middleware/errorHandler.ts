import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, any>;
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      message: 'Validation failed: Check provided fields',
      code: 'VALIDATION_ERROR',
      details: {
        errors: formattedErrors,
      },
    });
    return;
  }

  // Handle custom AppError
  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected internal error occurred'
      : err.message || 'An error occurred processing the request';

  // Do not expose stack traces or sensitive credentials
  res.status(statusCode).json({
    success: false,
    message,
    code,
    details: err.details || {},
  });
}
