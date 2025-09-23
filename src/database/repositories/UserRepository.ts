import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { User, IUser } from "../models/User";
import { Couple } from "../models/Couple";
import { AppError } from "@/utils/AppError";

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
      throw new AppError("Failed to find user", 500);
    }
  }

  /**
   * Find user by ID
   */
  async findById(userId: string | Types.ObjectId): Promise<IUser | null> {
    try {
      return await User.findById(userId).populate("coupleId");
    } catch (error) {
      throw new AppError("Failed to find user", 500);
    }
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string | Types.ObjectId,
    updateData: Partial<IUser>
  ): Promise<IUser | null> {
    try {
      // Remove sensitive fields that shouldn't be updated directly
      const { passwordHash, email, coupleId, ...safeUpdateData } = updateData;

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: safeUpdateData },
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
   * Update user preferences
   */
  async updatePreferences(
    userId: string | Types.ObjectId,
    preferences: { notifications?: boolean; darkMode?: boolean }
  ): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { preferences } },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new AppError("User not found", 404);
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update preferences", 500);
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(user: IUser, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      throw new AppError("Failed to verify password", 500);
    }
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string | Types.ObjectId,
    currentPassword: string,
    newPassword: string
  ): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError("User not found", 404);
      }

      // Verify current password
      const isValidPassword = await this.verifyPassword(user, currentPassword);
      if (!isValidPassword) {
        throw new AppError("Current password is incorrect", 400);
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      user.passwordHash = passwordHash;
      await user.save();

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to change password", 500);
    }
  }

  /**
   * Set user couple
   */
  async setUserCouple(
    userId: string | Types.ObjectId,
    coupleId: Types.ObjectId
  ): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { coupleId } },
        { new: true, runValidators: true }
      ).populate("coupleId");

      if (!user) {
        throw new AppError("User not found", 404);
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to set user couple", 500);
    }
  }

  /**
   * Remove user from couple
   */
  async removeFromCouple(
    userId: string | Types.ObjectId
  ): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $unset: { coupleId: "" } },
        { new: true }
      );

      if (!user) {
        throw new AppError("User not found", 404);
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to remove user from couple", 500);
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string | Types.ObjectId): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError("User not found", 404);
      }

      // If user is in a couple, handle couple deletion or partner notification
      if (user.coupleId) {
        const couple = await Couple.findById(user.coupleId);
        if (couple) {
          // Remove user from couple's users array
          couple.users = couple.users.filter((id) => !id.equals(user._id));

          if (couple.users.length === 0) {
            // If no users left, delete the couple
            await Couple.findByIdAndDelete(couple._id);
          } else {
            // Update the couple
            await couple.save();
            // Remove coupleId from remaining user
            await User.findByIdAndUpdate(couple.users[0], {
              $unset: { coupleId: "" },
            });
          }
        }
      }

      await User.findByIdAndDelete(userId);
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to delete user", 500);
    }
  }

  /**
   * Find users with filters and pagination options
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

      const users = await User.find(filter)
        .populate("coupleId")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select("-passwordHash"); // Exclude password hash

      return users;
    } catch (error) {
      throw new AppError("Failed to find users", 500);
    }
  }

  /**
   * Count users with filter
   */
  async countUsers(filter: any = {}): Promise<number> {
    try {
      return await User.countDocuments(filter);
    } catch (error) {
      throw new AppError("Failed to count users", 500);
    }
  }

  /**
   * Get users with pagination
   */
  async getUsers(
    page: number = 1,
    limit: number = 10,
    searchTerm?: string
  ): Promise<{
    users: IUser[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      let query = {};
      if (searchTerm) {
        query = {
          $or: [
            { name: { $regex: searchTerm, $options: "i" } },
            { email: { $regex: searchTerm, $options: "i" } },
          ],
        };
      }

      const [users, total] = await Promise.all([
        User.find(query)
          .populate("coupleId")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(query),
      ]);

      return {
        users,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      throw new AppError("Failed to get users", 500);
    }
  }
}
