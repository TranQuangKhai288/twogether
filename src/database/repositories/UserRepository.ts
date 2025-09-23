import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { User, IUser } from "../models/User.js";
import { Couple } from "../models/Couple.js";
import { AppError } from "@/utils/AppError.js";

export class UserRepository {
  /**
   * Create a new user
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
      // Check if user already exists
      const existingUser = await User.findOne({
        email: userData.email.toLowerCase(),
      });
      if (existingUser) {
        throw new AppError("User with this email already exists", 409);
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Create user
      const user = new User({
        ...userData,
        passwordHash,
        email: userData.email.toLowerCase(),
      });

      await user.save();
      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to create user", 500);
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email: email.toLowerCase() }).populate(
        "coupleId"
      );
    } catch (error) {
      throw new AppError("Failed to find user by email", 500);
    }
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<IUser | null> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        return null;
      }
      return await User.findById(userId).populate("coupleId");
    } catch (error) {
      throw new AppError("Failed to find user by ID", 500);
    }
  }

  /**
   * Update user profile
   */
  async updateUser(
    userId: string,
    updateData: {
      name?: string;
      gender?: "male" | "female" | "other";
      birthday?: Date;
      avatarUrl?: string;
      bio?: string;
      isOnline?: boolean;
      lastSeen?: Date;
    }
  ): Promise<IUser> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate("coupleId");

      if (!user) {
        throw new AppError("User not found", 404);
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update user", 500);
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const user = await User.findById(userId).select("+passwordHash");
      if (!user) {
        throw new AppError("User not found", 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );
      if (!isCurrentPasswordValid) {
        throw new AppError("Current password is incorrect", 400);
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await User.findByIdAndUpdate(userId, { passwordHash: newPasswordHash });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to change password", 500);
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(email: string, password: string): Promise<IUser | null> {
    try {
      const user = await User.findOne({ email: email.toLowerCase() }).select(
        "+passwordHash"
      );
      if (!user) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return null;
      }

      // Remove password hash from returned user
      const userObject = user.toObject();
      const { passwordHash, __v, ...cleanUser } = userObject;
      return cleanUser as IUser;
    } catch (error) {
      throw new AppError("Failed to verify password", 500);
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError("User not found", 404);
      }

      // If user is in a couple, remove them from the couple
      if (user.coupleId) {
        const couple = await Couple.findById(user.coupleId);
        if (couple) {
          // Remove user from couple
          couple.users = couple.users.filter((id) => id.toString() !== userId);

          if (couple.users.length === 0) {
            // Delete couple if no users left
            await Couple.findByIdAndDelete(couple._id);
          } else {
            await couple.save();
          }
        }
      }

      // Delete user
      await User.findByIdAndDelete(userId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to delete user", 500);
    }
  }

  /**
   * Update user online status
   */
  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      const updateData: any = { isOnline };
      if (!isOnline) {
        updateData.lastSeen = new Date();
      }

      await User.findByIdAndUpdate(userId, updateData);
    } catch (error) {
      throw new AppError("Failed to update online status", 500);
    }
  }

  /**
   * Search users by email (for invitations)
   */
  async searchByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({
        email: email.toLowerCase(),
      })
        .select("-passwordHash")
        .populate("coupleId");
    } catch (error) {
      throw new AppError("Failed to search user by email", 500);
    }
  }

  /**
   * Get users by IDs
   */
  async findByIds(userIds: string[]): Promise<IUser[]> {
    try {
      const objectIds = userIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

      return await User.find({
        _id: { $in: objectIds },
      })
        .select("-passwordHash")
        .populate("coupleId");
    } catch (error) {
      throw new AppError("Failed to find users by IDs", 500);
    }
  }

  /**
   * Update user couple association
   */
  async updateCoupleId(userId: string, coupleId: string | null): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, {
        coupleId: coupleId ? new Types.ObjectId(coupleId) : null,
      });
    } catch (error) {
      throw new AppError("Failed to update user couple association", 500);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    joinedAt: Date;
    hasCouple: boolean;
    totalUsers: number;
    profileComplete: boolean;
  }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError("User not found", 404);
      }

      return {
        joinedAt: user.createdAt,
        hasCouple: !!user.coupleId,
        totalUsers: await User.countDocuments(),
        profileComplete: !!(user.name && user.gender && user.birthday),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to get user statistics", 500);
    }
  }

  /**
   * Check if user exists
   */
  async exists(userId: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        return false;
      }
      const user = await User.findById(userId).select("_id");
      return !!user;
    } catch (error) {
      return false;
    }
  }

  /**
   * Find users without couple
   */
  async findSingleUsers(limit: number = 10): Promise<IUser[]> {
    try {
      return await User.find({
        coupleId: null,
      })
        .select("-passwordHash")
        .limit(limit)
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new AppError("Failed to find single users", 500);
    }
  }
}
