import { Types } from "mongoose";
import { User, IUser } from "../models/User";
import { AppError } from "@/utils/AppError";

export class UserRepository {
  /**
   * Create a new user (pure data access)
   */
  async create(userData: {
    email: string;
    password: string;
    name: string;
    gender: "male" | "female" | "other";
    birthday?: Date;
    avatarUrl?: string;
  }): Promise<IUser> {
    try {
      //hash password here if needed

      const user = new User(userData);
      await user.save();
      return user;
    } catch (error) {
      throw new AppError("Failed to create user", 500);
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email }).populate("couple");
    } catch (error) {
      throw new AppError("Failed to find user by email", 500);
    }
  }

  /**
   * Find user by ID
   */
  async findById(userId: string | Types.ObjectId): Promise<IUser | null> {
    try {
      return await User.findById(userId).populate("couple");
    } catch (error) {
      throw new AppError("Failed to find user by ID", 500);
    }
  }

  /**
   * Update user (pure data access)
   */
  async update(
    userId: string | Types.ObjectId,
    updateData: Partial<IUser>
  ): Promise<IUser | null> {
    try {
      return await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate("couple");
    } catch (error) {
      throw new AppError("Failed to update user", 500);
    }
  }

  /**
   * Update user preferences (pure data access)
   */
  async updatePreferences(
    userId: string | Types.ObjectId,
    preferences: { notifications?: boolean; darkMode?: boolean }
  ): Promise<IUser | null> {
    try {
      return await User.findByIdAndUpdate(
        userId,
        { $set: { preferences } },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new AppError("Failed to update preferences", 500);
    }
  }

  /**
   * Update password hash (pure data access)
   */
  async updatePasswordHash(
    userId: string | Types.ObjectId,
    passwordHash: string
  ): Promise<IUser | null> {
    try {
      return await User.findByIdAndUpdate(
        userId,
        { $set: { passwordHash } },
        { new: true }
      );
    } catch (error) {
      throw new AppError("Failed to update password", 500);
    }
  }

  /**
   * Set user couple (pure data access)
   */
  async setUserCouple(
    userId: string | Types.ObjectId,
    couple: Types.ObjectId
  ): Promise<IUser | null> {
    try {
      return await User.findByIdAndUpdate(
        userId,
        { $set: { couple } },
        { new: true, runValidators: true }
      ).populate("couple");
    } catch (error) {
      throw new AppError("Failed to set user couple", 500);
    }
  }

  /**
   * Remove user from couple (pure data access)
   */
  async removeFromCouple(
    userId: string | Types.ObjectId
  ): Promise<IUser | null> {
    try {
      return await User.findByIdAndUpdate(
        userId,
        { $unset: { couple: "" } },
        { new: true }
      );
    } catch (error) {
      throw new AppError("Failed to remove user from couple", 500);
    }
  }

  /**
   * Delete user (pure data access)
   */
  async delete(userId: string | Types.ObjectId): Promise<boolean> {
    try {
      const result = await User.findByIdAndDelete(userId);
      return !!result;
    } catch (error) {
      throw new AppError("Failed to delete user", 500);
    }
  }

  /**
   * Find users with filters and pagination options (pure data access)
   */
  async findUsers(
    filter: any = {},
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ): Promise<IUser[]> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;
      const skip = (page - 1) * limit;

      const sortOptions: any = {};
      sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

      return await User.find(filter)
        .populate("couple")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select("-passwordHash"); // Exclude password hash
    } catch (error) {
      throw new AppError("Failed to find users", 500);
    }
  }

  /**
   * Count users with filter (pure data access)
   */
  async countUsers(filter: any = {}): Promise<number> {
    try {
      return await User.countDocuments(filter);
    } catch (error) {
      throw new AppError("Failed to count users", 500);
    }
  }
}
