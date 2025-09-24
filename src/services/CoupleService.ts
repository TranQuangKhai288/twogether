import { Types } from "mongoose";
import { ICouple } from "@/database/models/Couple";
import { CoupleRepository } from "@/database/repositories/CoupleRepository";
import { UserRepository } from "@/database/repositories/UserRepository";
import { ICoupleService } from "./interfaces";
import { AppError } from "@/utils/AppError";

export class CoupleService implements ICoupleService {
  private coupleRepository: CoupleRepository;
  private userRepository: UserRepository;

  constructor() {
    this.coupleRepository = new CoupleRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Create a new couple with business logic validation
   */
  async createCouple(
    creatorId: string,
    partnerEmail: string,
    anniversaryDate: Date,
    relationshipStatus: "dating" | "engaged" | "married" = "dating"
  ): Promise<ICouple> {
    // Business validation
    if (!creatorId || !partnerEmail || !anniversaryDate) {
      throw new AppError(
        "Creator ID, partner email, and anniversary date are required",
        400
      );
    }

    if (!Types.ObjectId.isValid(creatorId)) {
      throw new AppError("Invalid creator ID format", 400);
    }

    // Find partner by email (business logic)
    const partner = await this.userRepository.findByEmail(partnerEmail);
    if (!partner) {
      throw new AppError("Partner not found with this email", 404);
    }

    // Check if creator exists (business logic)
    const creator = await this.userRepository.findById(creatorId);
    if (!creator) {
      throw new AppError("Creator not found", 404);
    }

    // Business logic: Check if either user is already in a couple
    if (creator.couple) {
      throw new AppError("You are already in a couple", 400);
    }
    if (partner.couple) {
      throw new AppError("Partner is already in a couple", 400);
    }

    // Business logic: Generate unique invite code
    let inviteCode = this.generateInviteCode();
    while (await this.coupleRepository.findByInviteCode(inviteCode)) {
      inviteCode = this.generateInviteCode();
    }

    // Business logic: Set default settings
    const defaultSettings = {
      shareLocation: false,
      allowPartnerToSeeNotes: true,
      allowPartnerToSeeMoods: true,
      allowPartnerToSeePhotos: true,
    };

    // Create couple using repository
    const couple = await this.coupleRepository.create({
      users: [creator._id, partner._id],
      anniversaryDate,
      relationshipStatus,
      inviteCode,
      settings: defaultSettings,
    });

    // Business logic: Update both users' coupleId
    await Promise.all([
      this.userRepository.setUserCouple(creator._id.toString(), couple._id),
      this.userRepository.setUserCouple(partner._id.toString(), couple._id),
    ]);

    await this.coupleRepository.findByIdWithUsers(couple._id.toString());
    return couple;
  }

  /**
   * Join couple by invite code with business logic
   */
  async joinCoupleByInviteCode(
    userId: string,
    inviteCode: string
  ): Promise<ICouple> {
    // Business validation
    if (!userId || !inviteCode) {
      throw new AppError("User ID and invite code are required", 400);
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID format", 400);
    }

    // Business logic: Find user and couple
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const couple = await this.coupleRepository.findByInviteCode(inviteCode);
    if (!couple) {
      throw new AppError("Invalid invite code", 404);
    }

    // Business logic: Validate join conditions
    if (user.couple) {
      throw new AppError("You are already in a couple", 400);
    }

    if (couple.users.length >= 2) {
      throw new AppError("This couple is already complete", 400);
    }

    if (
      couple.users.some(
        (existingUserId) => existingUserId.toString() === userId
      )
    ) {
      throw new AppError("You are already a member of this couple", 400);
    }

    // Business logic: Add user to couple
    const updatedCouple = await this.coupleRepository.updateUsers(
      couple._id.toString(),
      [...couple.users, new Types.ObjectId(userId)]
    );

    if (!updatedCouple) {
      throw new AppError("Failed to update couple", 500);
    }

    // Update user's couple reference
    await this.userRepository.setUserCouple(userId, couple._id);

    const result = await this.coupleRepository.findByIdWithUsers(
      updatedCouple._id.toString()
    );
    if (!result) {
      throw new AppError("Failed to retrieve updated couple", 500);
    }

    return result;
  }

  /**
   * Leave couple as partner with business logic
   */
  async leaveCoupleAsPartner(
    coupleId: string,
    userId: string
  ): Promise<boolean> {
    // Business validation
    if (!coupleId || !userId) {
      throw new AppError("Couple ID and user ID are required", 400);
    }

    if (!Types.ObjectId.isValid(coupleId) || !Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid ID format", 400);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.couple || user.couple.toString() !== coupleId) {
      throw new AppError("You are not in this couple", 400);
    }

    const couple = await this.coupleRepository.findById(coupleId);
    if (!couple) {
      throw new AppError("Couple not found", 404);
    }

    // Business logic: Remove user from couple
    const remainingUsers = couple.users.filter(
      (existingUserId) => existingUserId.toString() !== userId
    );

    if (remainingUsers.length === 0) {
      // If no users left, delete the couple
      await this.coupleRepository.delete(coupleId);
    } else {
      // Update couple with remaining users
      await this.coupleRepository.updateUsers(coupleId, remainingUsers);
    }

    // Remove couple reference from user (pass undefined instead of null)
    await this.userRepository.setUserCouple(userId, undefined as any);

    return true;
  }

  /**
   * Update couple settings with business logic
   */
  async updateCoupleSettings(
    coupleId: string,
    userId: string,
    settings: {
      shareLocation?: boolean;
      allowPartnerToSeeNotes?: boolean;
      allowPartnerToSeeMoods?: boolean;
      allowPartnerToSeePhotos?: boolean;
    }
  ): Promise<ICouple> {
    // Business validation
    if (!coupleId || !userId) {
      throw new AppError("Couple ID and user ID are required", 400);
    }

    // Verify user belongs to couple
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    const updatedCouple = await this.coupleRepository.updateSettings(
      coupleId,
      settings
    );
    if (!updatedCouple) {
      throw new AppError("Failed to update couple settings", 500);
    }

    return updatedCouple;
  }

  /**
   * Update anniversary date with business logic
   */
  async updateAnniversaryDate(
    coupleId: string,
    userId: string,
    anniversaryDate: Date
  ): Promise<ICouple> {
    // Business validation
    if (!coupleId || !userId || !anniversaryDate) {
      throw new AppError(
        "Couple ID, user ID, and anniversary date are required",
        400
      );
    }

    // Verify user belongs to couple
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    const updatedCouple = await this.coupleRepository.updateAnniversaryDate(
      coupleId,
      anniversaryDate
    );
    if (!updatedCouple) {
      throw new AppError("Failed to update anniversary date", 500);
    }

    return updatedCouple;
  }

  /**
   * Generate new invite code with business logic
   */
  async generateNewInviteCode(
    coupleId: string,
    userId: string
  ): Promise<ICouple> {
    // Business validation
    if (!coupleId || !userId) {
      throw new AppError("Couple ID and user ID are required", 400);
    }

    // Verify user belongs to couple
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Business logic: Generate unique invite code
    let newInviteCode = this.generateInviteCode();
    while (await this.coupleRepository.findByInviteCode(newInviteCode)) {
      newInviteCode = this.generateInviteCode();
    }

    const updatedCouple = await this.coupleRepository.updateInviteCode(
      coupleId,
      newInviteCode
    );
    if (!updatedCouple) {
      throw new AppError("Failed to generate new invite code", 500);
    }

    return updatedCouple;
  }

  /**
   * Get couple by user ID with business logic
   */
  async getCoupleByUserId(userId: string): Promise<ICouple | null> {
    if (!userId) {
      throw new AppError("User ID is required", 400);
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID format", 400);
    }

    return await this.coupleRepository.findByUserId(userId);
  }

  /**
   * Get couple by ID with business logic
   */
  async getCoupleById(
    coupleId: string,
    userId: string
  ): Promise<ICouple | null> {
    if (!coupleId || !userId) {
      throw new AppError("Couple ID and user ID are required", 400);
    }

    // Verify user belongs to couple
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    return await this.coupleRepository.findByIdWithUsers(coupleId);
  }

  /**
   * Get partner information with business logic
   */
  async getPartner(userId: string): Promise<any> {
    if (!userId) {
      throw new AppError("User ID is required", 400);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.couple) {
      throw new AppError("You are not in a couple", 400);
    }

    const couple = await this.coupleRepository.findByIdWithUsers(
      user.couple.toString()
    );
    if (!couple) {
      throw new AppError("Couple not found", 404);
    }

    // Business logic: Find partner (other user in couple) - users are populated
    const partner = (couple.users as any[]).find(
      (u: any) => u._id.toString() !== userId
    );

    if (!partner) {
      throw new AppError("Partner not found", 404);
    }

    return {
      id: partner._id,
      username: partner.username,
      email: partner.email,
      avatar: partner.avatar,
      createdAt: partner.createdAt,
    };
  }

  /**
   * Get couples with pagination (admin function)
   */
  async getCouples(
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
    return await this.coupleRepository.findWithPagination(options);
  }

  /**
   * Check if user belongs to couple
   */
  async isUserInCouple(coupleId: string, userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(coupleId) || !Types.ObjectId.isValid(userId)) {
      return false;
    }

    return await this.coupleRepository.isUserInCouple(coupleId, userId);
  }

  /**
   * Private method to generate invite code
   */
  private generateInviteCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
