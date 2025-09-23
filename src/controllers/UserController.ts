import { Request, Response } from "express";
import { ApiResponse, PaginatedResponse } from "@/types/index";
import { AppError } from "@/utils/AppError";
import { UserService } from "@/database/services/UserService";
import { asyncHandler } from "@/utils/asyncHandler";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }
  /**
   * Get all users with pagination
   */
  public getAllUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const sortBy = (req.query.sortBy as string) || "createdAt";
      const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";
      const search = req.query.search as string;

      // Build filter object
      const filter: any = {};
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Get users with pagination
      const users = await this.userService.findUsers(filter, {
        page,
        limit,
        sortBy,
        sortOrder,
      });

      const total = await this.userService.countUsers(filter);
      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<any> = {
        success: true,
        message: "Users retrieved successfully",
        data: users.map((user) => ({
          id: user._id,
          email: user.email,
          name: user.name,
          gender: user.gender,
          birthday: user.birthday,
          avatarUrl: user.avatarUrl,
          coupleId: user.coupleId,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get user by ID
   */
  public getUserById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      if (!id) {
        throw new AppError("User ID is required", 400);
      }

      const user = await this.userService.findById(id);

      if (!user) {
        throw new AppError("User not found", 404);
      }

      const response: ApiResponse = {
        success: true,
        message: "User retrieved successfully",
        data: {
          id: user._id,
          email: user.email,
          name: user.name,
          gender: user.gender,
          birthday: user.birthday,
          avatarUrl: user.avatarUrl,
          coupleId: user.coupleId,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update user (Admin only)
   */
  public updateUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        throw new AppError("User ID is required", 400);
      }

      // Remove sensitive fields that shouldn't be updated
      delete updateData.passwordHash;
      delete updateData._id;

      const updatedUser = await this.userService.updateUser(id, updateData);

      if (!updatedUser) {
        throw new AppError("User not found", 404);
      }

      const response: ApiResponse = {
        success: true,
        message: "User updated successfully",
        data: {
          id: updatedUser._id,
          email: updatedUser.email,
          name: updatedUser.name,
          gender: updatedUser.gender,
          birthday: updatedUser.birthday,
          avatarUrl: updatedUser.avatarUrl,
          coupleId: updatedUser.coupleId,
          preferences: updatedUser.preferences,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Delete user (Admin only)
   */
  public deleteUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      if (!id) {
        throw new AppError("User ID is required", 400);
      }

      // Check if user exists
      const user = await this.userService.findById(id);
      if (!user) {
        throw new AppError("User not found", 404);
      }

      // Delete user (this will also handle couple relationships)
      await this.userService.deleteUser(id);

      const response: ApiResponse = {
        success: true,
        message: "User deleted successfully",
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get current user profile
   */
  public getProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = req.user; // User is set by protect middleware

      const response: ApiResponse = {
        success: true,
        message: "Profile retrieved successfully",
        data: {
          id: user!._id,
          email: user!.email,
          name: user!.name,
          gender: user!.gender,
          birthday: user!.birthday,
          avatarUrl: user!.avatarUrl,
          coupleId: user!.coupleId,
          preferences: user!.preferences,
          createdAt: user!.createdAt,
          updatedAt: user!.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update current user profile
   */
  public updateProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;
      const updateData = req.body;

      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updateData.passwordHash;
      delete updateData.email; // Email updates might need separate verification
      delete updateData._id;
      delete updateData.coupleId; // Couple linking should be handled separately

      const updatedUser = await this.userService.updateUser(
        userId.toString(),
        updateData
      );

      if (!updatedUser) {
        throw new AppError("Failed to update user", 500);
      }

      const response: ApiResponse = {
        success: true,
        message: "Profile updated successfully",
        data: {
          id: updatedUser._id,
          email: updatedUser.email,
          name: updatedUser.name,
          gender: updatedUser.gender,
          birthday: updatedUser.birthday,
          avatarUrl: updatedUser.avatarUrl,
          coupleId: updatedUser.coupleId,
          preferences: updatedUser.preferences,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Change password
   */
  public changePassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new AppError(
          "Current password, new password and confirm password are required",
          400
        );
      }

      if (newPassword !== confirmPassword) {
        throw new AppError(
          "New password and confirm password do not match",
          400
        );
      }

      // Change password
      await this.userService.changePassword(
        userId.toString(),
        currentPassword,
        newPassword
      );

      const response: ApiResponse = {
        success: true,
        message: "Password changed successfully",
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update user preferences
   */
  public updatePreferences = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;
      const { preferences } = req.body;

      if (!preferences) {
        throw new AppError("Preferences data is required", 400);
      }

      const updatedUser = await this.userService.updatePreferences(
        userId.toString(),
        preferences
      );

      if (!updatedUser) {
        throw new AppError("Failed to update preferences", 500);
      }

      const response: ApiResponse = {
        success: true,
        message: "Preferences updated successfully",
        data: {
          preferences: updatedUser.preferences,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get user's couple information
   */
  public getCoupleInfo = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = req.user!;

      if (!user.coupleId) {
        const response: ApiResponse = {
          success: true,
          message: "User is not in a couple",
          data: {
            couple: null,
            isInCouple: false,
          },
          timestamp: new Date().toISOString(),
        };
        res.status(200).json(response);
        return;
      }

      const userWithCouple = await this.userService.findById(
        user._id.toString()
      );

      const response: ApiResponse = {
        success: false,
        message: "Couple information retrieved successfully",
        data: {
          couple: userWithCouple?.coupleId,
          isInCouple: !!userWithCouple?.coupleId,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Search users
   */
  public searchUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { q: searchTerm, page = 1, limit = 10 } = req.query;

      if (!searchTerm) {
        throw new AppError("Search term is required", 400);
      }

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;

      const filter = {
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { email: { $regex: searchTerm, $options: "i" } },
        ],
      };

      const users = await this.userService.findUsers(filter, {
        page: pageNum,
        limit: limitNum,
        sortBy: "name",
        sortOrder: "asc",
      });

      const total = await this.userService.countUsers(filter);
      const totalPages = Math.ceil(total / limitNum);

      const response: PaginatedResponse<any> = {
        success: true,
        message: "Users found successfully",
        data: users.map((user) => ({
          id: user._id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          isInCouple: !!user.coupleId,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );
}
