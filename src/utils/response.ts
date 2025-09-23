/**
 * Response utility functions for consistent API responses
 */

import { Response } from 'express';
import { ApiResponse, ErrorResponse, PaginatedResponse } from '@/types/index.js';

/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
  };

  if (data !== undefined) {
    response.data = data;
  }

  res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  message: string,
  error: string,
  statusCode: number = 500
): void => {
  const response: ErrorResponse = {
    success: false,
    message,
    error,
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};

/**
 * Send paginated response
 */
export const sendPaginatedResponse = <T>(
  res: Response,
  message: string,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  },
  statusCode: number = 200
): void => {
  const response: PaginatedResponse<T> = {
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};

/**
 * Send created response
 */
export const sendCreated = <T>(res: Response, message: string, data?: T): void => {
  sendSuccess(res, message, data, 201);
};

/**
 * Send no content response
 */
export const sendNoContent = (res: Response): void => {
  res.status(204).send();
};

/**
 * Send not found response
 */
export const sendNotFound = (res: Response, message: string = 'Resource not found'): void => {
  sendError(res, message, 'The requested resource was not found', 404);
};

/**
 * Send bad request response
 */
export const sendBadRequest = (res: Response, message: string, error: string): void => {
  sendError(res, message, error, 400);
};

/**
 * Send unauthorized response
 */
export const sendUnauthorized = (res: Response, message: string = 'Unauthorized'): void => {
  sendError(res, message, 'Authentication required', 401);
};

/**
 * Send forbidden response
 */
export const sendForbidden = (res: Response, message: string = 'Forbidden'): void => {
  sendError(res, message, 'Access denied', 403);
};