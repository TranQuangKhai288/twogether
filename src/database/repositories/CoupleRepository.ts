import { Types } from "mongoose";
import { Couple, ICouple } from "../models/Couple";
import { User } from "../models/User";
import { AppError } from "../../utils/AppError";
import { UserRepository } from "./UserRepository";

export class CoupleRepository {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Create a new couple with invite code
   */
  async createCouple(
    creatorId: string | Types.ObjectId,
    partnerEmail: string,
    anniversaryDate: Date,
    relationshipStatus: "dating" | "engaged" | "married" = "dating"
  ): Promise<ICouple> {
    try {
      // Find partner by email
      const partner = await this.userRepository.findByEmail(partnerEmail);
      if (!partner) {
        throw new AppError("Partner not found with this email", 404);
      }

      // Check if creator exists
      const creator = await this.userRepository.findById(creatorId.toString());
      if (!creator) {
        throw new AppError("Creator not found", 404);
      }

      // Check if either user is already in a couple
      if (creator.coupleId) {
        throw new AppError("You are already in a couple", 400);
      }
      if (partner.coupleId) {
        throw new AppError("Partner is already in a couple", 400);
      }

      // Generate unique invite code
      let inviteCode = this.generateInviteCode();

      // Ensure invite code is unique
      while (await Couple.findOne({ inviteCode })) {
        inviteCode = this.generateInviteCode();
      }

      // Create couple
      const couple = new Couple({
        users: [creator._id, partner._id],
        anniversaryDate,
        relationshipStatus,
        inviteCode,
        settings: {
          shareLocation: false,
          allowPartnerToSeeNotes: true,
          allowPartnerToSeeMoods: true,
          allowPartnerToSeePhotos: true,
        },
      });

      await couple.save();

      // Update both users' coupleId
      await Promise.all([
        this.userRepository.setUserCouple(creator._id.toString(), couple._id),
        this.userRepository.setUserCouple(partner._id.toString(), couple._id),
      ]);

      return await couple.populate("users", "-passwordHash");
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to create couple", 500);
    }
  }

  /**
   * Generate a unique invite code
   */
  private generateInviteCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Join couple by invite code
   */
  async joinCoupleByInviteCode(
    userId: string | Types.ObjectId,
    inviteCode: string
  ): Promise<ICouple> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError("User not found", 404);
      }

      if (user.coupleId) {
        throw new AppError("User is already in a couple", 409);
      }

      const couple = await Couple.findOne({
        inviteCode: inviteCode.toUpperCase(),
      });
      if (!couple) {
        throw new AppError("Invalid invite code", 404);
      }

      if (couple.users.length >= 2) {
        throw new AppError("Couple is already complete", 409);
      }

      // Check if user is already in this couple
      if (couple.users.some((id) => id.equals(user._id))) {
        throw new AppError("User is already part of this couple", 409);
      }

      // Add user to couple
      couple.users.push(user._id);
      await couple.save();

      // Update user with couple ID
      await this.userRepository.setUserCouple(userId, couple._id);

      return await couple.populate("users", "name email avatarUrl");
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to join couple", 500);
    }
  }

  /**
   * Get couple by ID
   */
  async getCoupleById(
    coupleId: string | Types.ObjectId
  ): Promise<ICouple | null> {
    try {
      return await Couple.findById(coupleId).populate(
        "users",
        "name email avatarUrl gender birthday"
      );
    } catch (error) {
      throw new AppError("Failed to get couple", 500);
    }
  }

  /**
   * Get couple by user ID
   */
  async getCoupleByUserId(
    userId: string | Types.ObjectId
  ): Promise<ICouple | null> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.coupleId) {
        return null;
      }

      return await this.getCoupleById(user.coupleId);
    } catch (error) {
      throw new AppError("Failed to get couple", 500);
    }
  }

  /**
   * Update couple settings
   */
  async updateCoupleSettings(
    coupleId: string | Types.ObjectId,
    settings: {
      allowLocationShare?: boolean;
      theme?: string;
    }
  ): Promise<ICouple | null> {
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
   * Update anniversary date
   */
  async updateAnniversaryDate(
    coupleId: string | Types.ObjectId,
    anniversaryDate: Date
  ): Promise<ICouple | null> {
    try {
      const couple = await Couple.findByIdAndUpdate(
        coupleId,
        { $set: { anniversaryDate } },
        { new: true, runValidators: true }
      ).populate("users", "name email avatarUrl");

      if (!couple) {
        throw new AppError("Couple not found", 404);
      }

      return couple;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update anniversary date", 500);
    }
  }

  /**
   * Generate new invite code
   */
  async generateNewInviteCode(
    coupleId: string | Types.ObjectId
  ): Promise<string> {
    try {
      const couple = await Couple.findById(coupleId);
      if (!couple) {
        throw new AppError("Couple not found", 404);
      }

      const newInviteCode = await (Couple as any).generateInviteCode();
      couple.inviteCode = newInviteCode;
      await couple.save();

      return newInviteCode;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to generate new invite code", 500);
    }
  }

  /**
   * Remove user from couple
   */
  async removeUserFromCouple(
    coupleId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<void> {
    try {
      const couple = await Couple.findById(coupleId);
      if (!couple) {
        throw new AppError("Couple not found", 404);
      }

      // Remove user from couple
      couple.users = couple.users.filter((id) => !id.equals(userId));

      if (couple.users.length === 0) {
        // If no users left, delete the couple
        await Couple.findByIdAndDelete(coupleId);
      } else {
        await couple.save();
      }

      // Remove couple ID from user
      await this.userRepository.removeFromCouple(userId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to remove user from couple", 500);
    }
  }

  /**
   * Delete couple
   */
  async deleteCouple(coupleId: string | Types.ObjectId): Promise<void> {
    try {
      const couple = await Couple.findById(coupleId);
      if (!couple) {
        throw new AppError("Couple not found", 404);
      }

      // Remove couple ID from all users
      await Promise.all(
        couple.users.map((userId) =>
          this.userRepository.removeFromCouple(userId)
        )
      );

      // Delete the couple
      await Couple.findByIdAndDelete(coupleId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to delete couple", 500);
    }
  }

  /**
   * Check if user belongs to couple
   */
  async isUserInCouple(
    coupleId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<boolean> {
    try {
      const couple = await Couple.findById(coupleId);
      if (!couple) {
        return false;
      }

      return couple.users.some((id) => id.equals(userId));
    } catch (error) {
      return false;
    }
  }

  /**
   * Get partner in couple
   */
  async getPartner(
    coupleId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<any | null> {
    try {
      const couple = await Couple.findById(coupleId).populate(
        "users",
        "name email avatarUrl gender birthday"
      );
      if (!couple) {
        return null;
      }

      return couple.users.find((user: any) => !user._id.equals(userId)) || null;
    } catch (error) {
      throw new AppError("Failed to get partner", 500);
    }
  }

  /**
   * Get couples with pagination (admin function)
   */
  async getCouples(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    couples: ICouple[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [couples, total] = await Promise.all([
        Couple.find()
          .populate("users", "name email avatarUrl")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Couple.countDocuments(),
      ]);

      return {
        couples,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      throw new AppError("Failed to get couples", 500);
    }
  }
}
