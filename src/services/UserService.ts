import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { IUser } from "@/database/models/User";
import { UserRepository } from "@/database/repositories/UserRepository";
import { CoupleRepository } from "@/database/repositories/CoupleRepository";
import { IUserService } from "./interfaces";
import { AppError } from "@/utils/AppError";

export class UserService implements IUserService {
  private userRepository: UserRepository;
  private coupleRepository: CoupleRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.coupleRepository = new CoupleRepository();
  }

  /**
   * Create a new user with business logic validation
   */
  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    gender: "male" | "female" | "other";
    birthday?: Date;
    avatarUrl?: string;
  }): Promise<IUser> {
    try {
      // Business validation
      if (!userData.email || !userData.password || !userData.name) {
        throw new AppError("Email, password, and name are required", 400);
      }

      if (userData.password.length < 6) {
        throw new AppError("Password must be at least 6 characters long", 400);
      }

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(
        userData.email
      );
      if (existingUser) {
        throw new AppError("User with this email already exists", 409);
      }

      // Hash password (business logic)
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Prepare data for repository
      const userDataForRepo = {
        ...userData,
        passwordHash,
        email: userData.email.toLowerCase(),
      };

      // Create user via repository
      return await this.userRepository.create(userDataForRepo);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to create user", 500);
    }
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<IUser | null> {
    if (!email) {
      throw new AppError("Email is required", 400);
    }
    return await this.userRepository.findByEmail(email.toLowerCase());
  }

  /**
   * Find user by ID
   */
  async findUserById(userId: string): Promise<IUser | null> {
    if (!userId) {
      throw new AppError("User ID is required", 400);
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID format", 400);
    }

    return await this.userRepository.findById(userId);
  }

  /**
   * Update user with business logic
   */
  async updateUser(
    userId: string,
    updateData: Partial<IUser>
  ): Promise<IUser | null> {
    if (!userId) {
      throw new AppError("User ID is required", 400);
    }

    // Business logic: Remove sensitive fields that shouldn't be updated directly
    const { passwordHash, email, couple, ...safeUpdateData } = updateData;

    if (Object.keys(safeUpdateData).length === 0) {
      throw new AppError("No valid fields to update", 400);
    }

    const user = await this.userRepository.update(userId, safeUpdateData);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferences: { notifications?: boolean; darkMode?: boolean }
  ): Promise<IUser | null> {
    if (!userId) {
      throw new AppError("User ID is required", 400);
    }

    if (!preferences || Object.keys(preferences).length === 0) {
      throw new AppError("Preferences data is required", 400);
    }

    return await this.userRepository.updatePreferences(userId, preferences);
  }

  /**
   * Verify user password
   */
  async verifyUserPassword(user: IUser, password: string): Promise<boolean> {
    if (!user || !password) {
      throw new AppError("User and password are required", 400);
    }

    try {
      return await bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      throw new AppError("Failed to verify password", 500);
    }
  }

  /**
   * Change password with business logic
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<IUser | null> {
    if (!userId || !currentPassword || !newPassword) {
      throw new AppError(
        "User ID, current password, and new password are required",
        400
      );
    }

    if (newPassword.length < 6) {
      throw new AppError(
        "New password must be at least 6 characters long",
        400
      );
    }

    if (currentPassword === newPassword) {
      throw new AppError(
        "New password must be different from current password",
        400
      );
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Verify current password
    const isValidPassword = await this.verifyUserPassword(
      user,
      currentPassword
    );
    if (!isValidPassword) {
      throw new AppError("Current password is incorrect", 400);
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    return await this.userRepository.updatePasswordHash(userId, passwordHash);
  }

  /**
   * Delete user with complex business logic
   */
  async deleteUser(userId: string): Promise<boolean> {
    if (!userId) {
      throw new AppError("User ID is required", 400);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Business logic: Handle couple relationship before deletion
    if (user.couple) {
      await this.coupleRepository.removeUserFromCouple(
        user.couple.toString(),
        userId
      );
    }

    return await this.userRepository.delete(userId);
  }

  /**
   * Get users with pagination and business logic
   */
  async getUsersWithPagination(
    options: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ): Promise<{
    users: IUser[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    // Business validation
    if (page < 1) {
      throw new AppError("Page must be greater than 0", 400);
    }
    if (limit < 1 || limit > 100) {
      throw new AppError("Limit must be between 1 and 100", 400);
    }

    // Build filter object (business logic)
    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userRepository.findUsers(filter, {
        page,
        limit,
        sortBy,
        sortOrder,
      }),
      this.userRepository.countUsers(filter),
    ]);

    return {
      users,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }
}
