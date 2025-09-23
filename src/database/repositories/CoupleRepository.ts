import { Types } from "mongoose";
import { Couple, ICouple } from "../models/Couple.js";
import { User } from "../models/User.js";
import { AppError } from "../../utils/AppError.js";

export class CoupleRepository {
  /**
   * Create a new couple
   */
  async createCouple(
    userIds: [Types.ObjectId, Types.ObjectId],
    anniversaryDate: Date,
    relationshipStatus: "dating" | "engaged" | "married" = "dating"
  ): Promise<ICouple> {
    try {
      // Generate unique invite code
      let inviteCode = this.generateInviteCode();

      // Ensure invite code is unique
      while (await Couple.findOne({ inviteCode })) {
        inviteCode = this.generateInviteCode();
      }

      // Create couple
      const couple = new Couple({
        users: userIds,
        anniversaryDate,
        relationshipStatus,
        inviteCode,
        status: "active",
      });

      await couple.save();
      return couple.populate("users", "name email avatarUrl");
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to create couple", 500);
    }
  }

  /**
   * Find couple by ID
   */
  async findById(coupleId: string): Promise<ICouple | null> {
    try {
      if (!Types.ObjectId.isValid(coupleId)) {
        return null;
      }
      return await Couple.findById(coupleId).populate(
        "users",
        "name email avatarUrl"
      );
    } catch (error) {
      throw new AppError("Failed to find couple", 500);
    }
  }

  /**
   * Find couple by invite code
   */
  async findByInviteCode(inviteCode: string): Promise<ICouple | null> {
    try {
      return await Couple.findOne({ inviteCode }).populate(
        "users",
        "name email avatarUrl"
      );
    } catch (error) {
      throw new AppError("Failed to find couple by invite code", 500);
    }
  }

  /**
   * Find couple by user ID
   */
  async findByUserId(userId: string): Promise<ICouple | null> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        return null;
      }
      return await Couple.findOne({
        users: new Types.ObjectId(userId),
      }).populate("users", "name email avatarUrl");
    } catch (error) {
      throw new AppError("Failed to find couple by user ID", 500);
    }
  }

  /**
   * Update couple
   */
  async updateCouple(
    coupleId: string,
    updateData: {
      anniversaryDate?: Date;
      relationshipStatus?: "dating" | "engaged" | "married";
      bio?: string;
      status?: "active" | "inactive";
      settings?: {
        shareLocation?: boolean;
        shareCalendar?: boolean;
        allowInvitations?: boolean;
        privacy?: "public" | "private";
      };
    }
  ): Promise<ICouple> {
    try {
      const couple = await Couple.findByIdAndUpdate(
        coupleId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate("users", "name email avatarUrl");

      if (!couple) {
        throw new AppError("Couple not found", 404);
      }

      return couple;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update couple", 500);
    }
  }

  /**
   * Delete couple
   */
  async deleteCouple(coupleId: string): Promise<void> {
    try {
      const couple = await Couple.findById(coupleId);
      if (!couple) {
        throw new AppError("Couple not found", 404);
      }

      // Remove couple reference from users
      await User.updateMany(
        { _id: { $in: couple.users } },
        { $unset: { coupleId: 1 } }
      );

      // Delete couple
      await Couple.findByIdAndDelete(coupleId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to delete couple", 500);
    }
  }

  /**
   * Add user to couple
   */
  async addUserToCouple(coupleId: string, userId: string): Promise<ICouple> {
    try {
      const couple = await Couple.findById(coupleId);
      if (!couple) {
        throw new AppError("Couple not found", 404);
      }

      if (couple.users.length >= 2) {
        throw new AppError("Couple already has maximum users", 400);
      }

      const userObjectId = new Types.ObjectId(userId);
      if (couple.users.some((id) => id.equals(userObjectId))) {
        throw new AppError("User is already in this couple", 400);
      }

      couple.users.push(userObjectId);
      await couple.save();

      // Update user's couple reference
      await User.findByIdAndUpdate(userId, { coupleId: couple._id });

      return couple.populate("users", "name email avatarUrl");
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to add user to couple", 500);
    }
  }

  /**
   * Remove user from couple
   */
  async removeUserFromCouple(
    coupleId: string,
    userId: string
  ): Promise<ICouple | null> {
    try {
      const couple = await Couple.findById(coupleId);
      if (!couple) {
        throw new AppError("Couple not found", 404);
      }

      const userObjectId = new Types.ObjectId(userId);
      couple.users = couple.users.filter((id) => !id.equals(userObjectId));

      // Update user's couple reference
      await User.findByIdAndUpdate(userId, { $unset: { coupleId: 1 } });

      if (couple.users.length === 0) {
        // Delete couple if no users left
        await Couple.findByIdAndDelete(coupleId);
        return null;
      }

      await couple.save();
      return couple.populate("users", "name email avatarUrl");
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to remove user from couple", 500);
    }
  }

  /**
   * Regenerate invite code
   */
  async regenerateInviteCode(coupleId: string): Promise<string> {
    try {
      let newInviteCode = this.generateInviteCode();

      // Ensure new invite code is unique
      while (await Couple.findOne({ inviteCode: newInviteCode })) {
        newInviteCode = this.generateInviteCode();
      }

      await Couple.findByIdAndUpdate(coupleId, { inviteCode: newInviteCode });
      return newInviteCode;
    } catch (error) {
      throw new AppError("Failed to regenerate invite code", 500);
    }
  }

  /**
   * Get couple statistics
   */
  async getCoupleStats(coupleId: string): Promise<{
    createdAt: Date;
    daysTogether: number;
    status: string;
    userCount: number;
    anniversaryDate: Date;
  }> {
    try {
      const couple = await Couple.findById(coupleId);
      if (!couple) {
        throw new AppError("Couple not found", 404);
      }

      const now = new Date();
      const daysTogether = Math.floor(
        (now.getTime() - couple.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        createdAt: couple.createdAt,
        daysTogether,
        status: couple.status,
        userCount: couple.users.length,
        anniversaryDate: couple.anniversaryDate,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to get couple statistics", 500);
    }
  }

  /**
   * Check if user belongs to couple
   */
  async isUserInCouple(coupleId: string, userId: string): Promise<boolean> {
    try {
      if (
        !Types.ObjectId.isValid(coupleId) ||
        !Types.ObjectId.isValid(userId)
      ) {
        return false;
      }

      const couple = await Couple.findById(coupleId);
      if (!couple) {
        return false;
      }

      return couple.users.some((id) => id.toString() === userId);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all couples (admin function)
   */
  async getAllCouples(
    options: {
      status?: "active" | "inactive";
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    couples: ICouple[];
    total: number;
  }> {
    try {
      let query: any = {};
      if (options.status) {
        query.status = options.status;
      }

      const total = await Couple.countDocuments(query);

      let couplesQuery = Couple.find(query).populate(
        "users",
        "name email avatarUrl"
      );

      if (options.limit) {
        couplesQuery = couplesQuery.limit(options.limit);
      }

      if (options.offset) {
        couplesQuery = couplesQuery.skip(options.offset);
      }

      const couples = await couplesQuery.sort({ createdAt: -1 }).exec();

      return { couples, total };
    } catch (error) {
      throw new AppError("Failed to get all couples", 500);
    }
  }

  /**
   * Check if couple exists
   */
  async exists(coupleId: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(coupleId)) {
        return false;
      }
      const couple = await Couple.findById(coupleId).select("_id");
      return !!couple;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update couple settings
   */
  async updateSettings(
    coupleId: string,
    settings: {
      shareLocation?: boolean;
      shareCalendar?: boolean;
      allowInvitations?: boolean;
      privacy?: "public" | "private";
    }
  ): Promise<ICouple> {
    try {
      const couple = await Couple.findByIdAndUpdate(
        coupleId,
        { $set: { settings } },
        { new: true, runValidators: true }
      ).populate("users", "name email avatarUrl");

      if (!couple) {
        throw new AppError("Couple not found", 404);
      }

      return couple;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update couple settings", 500);
    }
  }

  /**
   * Generate random invite code
   */
  private generateInviteCode(): string {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  }
}
