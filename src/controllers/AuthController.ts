import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '@/types';
import { AppError } from '@/middleware/errorHandler';
import { UserService } from '@/database/services/UserService';

export class AuthController {
  private userService = new UserService();

  /**
   * Generate JWT token
   */
  private generateToken(userId: string): string {
    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    
    return jwt.sign({ userId }, secret, { expiresIn: '7d' });
  }
  /**
   * Register a new user
   */
  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, firstName, lastName, gender, birthday } = req.body;

      // Validation
      if (!email || !password || !firstName || !lastName || !gender) {
        throw new AppError('All required fields must be provided', 400);
      }

      // Create user data
      const userData: {
        email: string;
        password: string;
        name: string;
        gender: 'male' | 'female' | 'other';
        birthday?: Date;
      } = {
        email,
        password,
        name: `${firstName} ${lastName}`,
        gender,
      };

      if (birthday) {
        userData.birthday = new Date(birthday);
      }

      // Create user
      const user = await this.userService.createUser(userData);

      // Generate JWT token
      const token = this.generateToken(user._id.toString());

      const response: ApiResponse = {
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            gender: user.gender,
            birthday: user.birthday,
            avatarUrl: user.avatarUrl,
            preferences: user.preferences,
            createdAt: user.createdAt,
          },
          token,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Login user
   */
  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError('Email and password are required', 400);
      }

      // Find user by email
      const user = await this.userService.findByEmail(email);
      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      // Verify password
      const isValidPassword = await this.userService.verifyPassword(user, password);
      if (!isValidPassword) {
        throw new AppError('Invalid email or password', 401);
      }

      // Generate token
      const token = this.generateToken(user._id.toString());

      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            gender: user.gender,
            birthday: user.birthday,
            avatarUrl: user.avatarUrl,
            coupleId: user.coupleId,
            preferences: user.preferences,
            createdAt: user.createdAt,
          },
          token,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user
   */
  public logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // TODO: Implement logout logic (invalidate token)
      
      const response: ApiResponse = {
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh access token
   */
  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400);
      }

      // TODO: Implement token refresh logic
      
      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: 'new-mock-jwt-token',
          refreshToken: 'new-mock-refresh-token',
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Send password reset email
   */
  public forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError('Email is required', 400);
      }

      // TODO: Implement forgot password logic
      
      const response: ApiResponse = {
        success: true,
        message: 'Password reset email sent successfully',
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reset password
   */
  public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new AppError('Token and new password are required', 400);
      }

      // TODO: Implement password reset logic
      
      const response: ApiResponse = {
        success: true,
        message: 'Password reset successfully',
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}