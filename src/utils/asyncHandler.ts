import { Request, Response, NextFunction } from 'express';

/**
 * Async error handler wrapper
 * Catches async errors and passes them to Express error handler
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};