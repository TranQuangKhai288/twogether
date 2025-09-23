import { Request, Response } from 'express';
import { ApiResponse } from '@/types';

export const notFoundHandler = (_req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    message: 'Route not found',
    error: 'The requested endpoint does not exist',
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
};