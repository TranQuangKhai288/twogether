import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../database/models/User';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Middleware to protect routes - requires valid JWT token
 */
export const protect = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 1) Check if token exists
  // Token can be in Authorization header or cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  // 2) Verify token
  let decoded: JWTPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Your token has expired. Please log in again.', 401));
    } else if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token. Please log in again.', 401));
    } else {
      return next(new AppError('Token verification failed.', 401));
    }
  }

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.userId).select('-passwordHash');
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does not exist.', 401));
  }

  // 4) Check if user changed password after the token was issued
  // This is optional but adds extra security
  // Note: passwordChangedAt field would need to be added to User model if needed
  // if (currentUser.passwordChangedAt && decoded.iat) {
  //   const changedTimestamp = Math.floor(currentUser.passwordChangedAt.getTime() / 1000);
  //   if (decoded.iat < changedTimestamp) {
  //     return next(new AppError('User recently changed password. Please log in again.', 401));
  //   }
  // }

  // 5) Grant access to protected route
  req.user = currentUser;
  next();
});

/**
 * Middleware to restrict access to certain roles
 * Usage: restrictTo('admin', 'moderator')
 * Note: User model would need a 'role' field for this to work
 */
export const restrictTo = (..._roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('You must be logged in to access this resource.', 401));
    }

    // Note: Uncomment this when role field is added to User model
    // if (!roles.includes(req.user.role)) {
    //   return next(new AppError('You do not have permission to perform this action.', 403));
    // }

    next();
  };
};

/**
 * Optional middleware - sets user if token is valid but doesn't require it
 * Useful for routes that can work with or without authentication
 */
export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JWTPayload;
      const currentUser = await User.findById(decoded.userId).select('-passwordHash');
      
      if (currentUser) {
        req.user = currentUser;
      }
    } catch (error) {
      // Ignore errors for optional authentication
      // User will simply not be authenticated
    }
  }

  next();
});