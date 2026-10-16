import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof ZodError) {
    const errorDetails = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: `Validation failed: ${errorDetails}`,
      },
    });
    return;
  }

  const statusCode = err.statusCode || (err.message && err.message.startsWith('DUPLICATE') ? 409 : 500);
  const errorCode = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred. Please try again.';

  console.error(`❌ [${req.method} ${req.path}] Error:`, err);

  res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code: errorCode,
      message,
    },
  });
};
