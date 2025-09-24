import { Types } from "mongoose";
import { Couple, ICouple } from "../models/Couple";

export class CoupleRepository {
  /**
   * Create a new couple (data access only)
   */
  async create(coupleData: {
    users: Types.ObjectId[];
    anniversaryDate: Date;
    relationshipStatus: "dating" | "engaged" | "married";
    inviteCode: string;
    settings: {
      shareLocation: boolean;
      allowPartnerToSeeNotes: boolean;
      allowPartnerToSeeMoods: boolean;
      allowPartnerToSeePhotos: boolean;
    };
  }): Promise<ICouple> {
    try {
      const couple = new Couple(coupleData);
      return await couple.save();
    } catch (error: any) {
      throw new Error(`Failed to create couple: ${error.message}`);
    }
  }

  /**
   * Find couple by ID (data access only)
   */
  async findById(coupleId: string): Promise<ICouple | null> {
    try {
      return await Couple.findById(coupleId);
    } catch (error: any) {
      throw new Error(`Failed to find couple by ID: ${error.message}`);
    }
  }

  /**
   * Find couple by ID with populated users (data access only)
   */
  async findByIdWithUsers(coupleId: string): Promise<ICouple | null> {
    try {
      return await Couple.findById(coupleId).populate("users", "-passwordHash");
    } catch (error: any) {
      throw new Error(`Failed to find couple with users: ${error.message}`);
    }
  }

  /**
   * Find couple by user ID (data access only)
   */
  async findByUserId(userId: string): Promise<ICouple | null> {
    try {
      return await Couple.findOne({ users: userId }).populate(
        "users",
        "-passwordHash"
      );
    } catch (error: any) {
      throw new Error(`Failed to find couple by user ID: ${error.message}`);
    }
  }

  /**
   * Find couple by invite code (data access only)
   */
  async findByInviteCode(inviteCode: string): Promise<ICouple | null> {
    try {
      return await Couple.findOne({ inviteCode });
    } catch (error: any) {
      throw new Error(`Failed to find couple by invite code: ${error.message}`);
    }
  }

  /**
   * Update couple users (data access only)
   */
  async updateUsers(
    coupleId: string,
    users: Types.ObjectId[]
  ): Promise<ICouple | null> {
    try {
      return await Couple.findByIdAndUpdate(
        coupleId,
        { users },
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Failed to update couple users: ${error.message}`);
    }
  }

  /**
   * Update couple settings (data access only)
   */
  async updateSettings(
    coupleId: string,
    settings: {
      shareLocation?: boolean;
      allowPartnerToSeeNotes?: boolean;
      allowPartnerToSeeMoods?: boolean;
      allowPartnerToSeePhotos?: boolean;
    }
  ): Promise<ICouple | null> {
    try {
      return await Couple.findByIdAndUpdate(
        coupleId,
        { $set: { settings } },
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Failed to update couple settings: ${error.message}`);
    }
  }

  /**
   * Update anniversary date (data access only)
   */
  async updateAnniversaryDate(
    coupleId: string,
    anniversaryDate: Date
  ): Promise<ICouple | null> {
    try {
      return await Couple.findByIdAndUpdate(
        coupleId,
        { anniversaryDate },
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Failed to update anniversary date: ${error.message}`);
    }
  }

  /**
   * Update invite code (data access only)
   */
  async updateInviteCode(
    coupleId: string,
    inviteCode: string
  ): Promise<ICouple | null> {
    try {
      return await Couple.findByIdAndUpdate(
        coupleId,
        { inviteCode },
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Failed to update invite code: ${error.message}`);
    }
  }

  /**
   * Delete couple (data access only)
   */
  async delete(coupleId: string): Promise<boolean> {
    try {
      const result = await Couple.findByIdAndDelete(coupleId);
      return result !== null;
    } catch (error: any) {
      throw new Error(`Failed to delete couple: ${error.message}`);
    }
  }

  /**
   * Check if user is in couple (data access only)
   */
  async isUserInCouple(coupleId: string, userId: string): Promise<boolean> {
    try {
      const couple = await Couple.findOne({
        _id: coupleId,
        users: userId,
      });
      return couple !== null;
    } catch (error: any) {
      throw new Error(`Failed to check if user is in couple: ${error.message}`);
    }
  }

  /**
   * Find couples with pagination (data access only)
   */
  async findWithPagination(
    options: {
      limit?: number;
      page?: number;
      status?: "dating" | "engaged" | "married";
    } = {}
  ): Promise<{
    couples: ICouple[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const { limit = 10, page = 1, status } = options;

      const filter: any = {};
      if (status) {
        filter.relationshipStatus = status;
      }

      const [couples, total] = await Promise.all([
        Couple.find(filter)
          .populate("users", "-passwordHash")
          .skip((page - 1) * limit)
          .limit(limit)
          .sort({ createdAt: -1 }),
        Couple.countDocuments(filter),
      ]);

      return {
        couples,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new Error(
        `Failed to find couples with pagination: ${error.message}`
      );
    }
  }
}
