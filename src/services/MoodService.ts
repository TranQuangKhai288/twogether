import { Types } from "mongoose";
import { IMood } from "../database/models/Mood";
import { MoodRepository } from "../database/repositories/MoodRepository";
import { CoupleRepository } from "../database/repositories/CoupleRepository";
import { IMoodService } from "./interfaces";
import { AppError } from "../utils/AppError";

export class MoodService implements IMoodService {
  private moodRepository: MoodRepository;
  private coupleRepository: CoupleRepository;

  constructor() {
    this.moodRepository = new MoodRepository();
    this.coupleRepository = new CoupleRepository();
  }

  /**
   * Create a new mood entry with business logic validation
   */
  async createMood(
    coupleId: string,
    userId: string,
    moodData: {
      mood: string;
      note?: string;
    }
  ): Promise<IMood> {
    // Business validation
    if (!coupleId || !userId || !moodData.mood) {
      throw new AppError("Couple ID, user ID, and mood are required", 400);
    }

    if (!Types.ObjectId.isValid(coupleId) || !Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid ID format", 400);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Business logic: Validate mood value
    const validMoods = [
      "happy",
      "sad",
      "excited",
      "angry",
      "neutral",
      "anxious",
      "love",
      "tired",
    ];
    if (!validMoods.includes(moodData.mood.toLowerCase())) {
      throw new AppError("Invalid mood value", 400);
    }

    return await this.moodRepository.create(coupleId, userId, {
      mood: moodData.mood.toLowerCase(),
      note: moodData.note || "",
    });
  }

  /**
   * Get latest mood for a user with business logic
   */
  async getLatestMoodForUser(
    coupleId: string,
    targetUserId: string,
    requestUserId: string
  ): Promise<IMood | null> {
    // Business validation
    if (!coupleId || !targetUserId || !requestUserId) {
      throw new AppError(
        "Couple ID, target user ID, and request user ID are required",
        400
      );
    }

    // Verify requester belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      requestUserId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Business logic: Check if target user is also in the couple
    const isTargetInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      targetUserId
    );
    if (!isTargetInCouple) {
      throw new AppError("Target user is not a member of this couple", 404);
    }

    return await this.moodRepository.findLatestByUserId(coupleId, targetUserId);
  }

  /**
   * Get mood history with business logic
   */
  async getMoodHistory(
    coupleId: string,
    userId: string,
    options: {
      targetUserId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    moods: IMood[];
    total: number;
  }> {
    // Business validation
    if (!coupleId || !userId) {
      throw new AppError("Couple ID and user ID are required", 400);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Business logic: If targetUserId is specified, verify they're in the couple
    if (options.targetUserId) {
      const isTargetInCouple = await this.coupleRepository.isUserInCouple(
        coupleId,
        options.targetUserId
      );
      if (!isTargetInCouple) {
        throw new AppError("Target user is not a member of this couple", 404);
      }
    }

    const filters: any = { coupleId: new Types.ObjectId(coupleId) };

    if (options.targetUserId) {
      filters.userId = new Types.ObjectId(options.targetUserId);
    }

    if (options.startDate || options.endDate) {
      filters.createdAt = {};
      if (options.startDate) {
        filters.createdAt.$gte = options.startDate;
      }
      if (options.endDate) {
        filters.createdAt.$lte = options.endDate;
      }
    }

    const [moods, total] = await Promise.all([
      this.moodRepository.findByFilters(filters, {
        limit: options.limit,
        offset: options.offset,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
      this.moodRepository.countByFilters(filters),
    ]);

    return { moods, total };
  }

  /**
   * Get mood by ID with business logic
   */
  async getMoodById(moodId: string, userId: string): Promise<IMood> {
    // Business validation
    if (!moodId || !userId) {
      throw new AppError("Mood ID and user ID are required", 400);
    }

    if (!Types.ObjectId.isValid(moodId) || !Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid ID format", 400);
    }

    const mood = await this.moodRepository.findById(moodId);
    if (!mood) {
      throw new AppError("Mood not found", 404);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      mood.coupleId.toString(),
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    return mood;
  }

  /**
   * Update mood with business logic
   */
  async updateMood(
    moodId: string,
    userId: string,
    updateData: {
      mood?: string;
      note?: string;
    }
  ): Promise<IMood> {
    // Business validation
    if (!moodId || !userId) {
      throw new AppError("Mood ID and user ID are required", 400);
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      throw new AppError("Update data is required", 400);
    }

    const mood = await this.moodRepository.findById(moodId);
    if (!mood) {
      throw new AppError("Mood not found", 404);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      mood.coupleId.toString(),
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Business logic: Only the mood owner can update it
    if (mood.userId.toString() !== userId) {
      throw new AppError("You can only update your own moods", 403);
    }

    // Business logic: Validate mood value if provided
    if (updateData.mood) {
      const validMoods = [
        "happy",
        "sad",
        "excited",
        "angry",
        "neutral",
        "anxious",
        "love",
        "tired",
      ];
      if (!validMoods.includes(updateData.mood.toLowerCase())) {
        throw new AppError("Invalid mood value", 400);
      }
      updateData.mood = updateData.mood.toLowerCase();
    }

    const updatedMood = await this.moodRepository.update(moodId, updateData);
    if (!updatedMood) {
      throw new AppError("Failed to update mood", 500);
    }

    return updatedMood;
  }

  /**
   * Delete mood with business logic
   */
  async deleteMood(moodId: string, userId: string): Promise<boolean> {
    // Business validation
    if (!moodId || !userId) {
      throw new AppError("Mood ID and user ID are required", 400);
    }

    const mood = await this.moodRepository.findById(moodId);
    if (!mood) {
      throw new AppError("Mood not found", 404);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      mood.coupleId.toString(),
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Business logic: Only the mood owner can delete it
    if (mood.userId.toString() !== userId) {
      throw new AppError("You can only delete your own moods", 403);
    }

    return await this.moodRepository.delete(moodId);
  }

  /**
   * Get mood statistics with business logic
   */
  async getMoodStats(
    coupleId: string,
    userId: string,
    options: {
      targetUserId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<any> {
    // Business validation
    if (!coupleId || !userId) {
      throw new AppError("Couple ID and user ID are required", 400);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Business logic: If targetUserId is specified, verify they're in the couple
    if (options.targetUserId) {
      const isTargetInCouple = await this.coupleRepository.isUserInCouple(
        coupleId,
        options.targetUserId
      );
      if (!isTargetInCouple) {
        throw new AppError("Target user is not a member of this couple", 404);
      }
    }

    const filters: any = { coupleId: new Types.ObjectId(coupleId) };

    if (options.targetUserId) {
      filters.userId = new Types.ObjectId(options.targetUserId);
    }

    if (options.startDate || options.endDate) {
      filters.createdAt = {};
      if (options.startDate) {
        filters.createdAt.$gte = options.startDate;
      }
      if (options.endDate) {
        filters.createdAt.$lte = options.endDate;
      }
    }

    // Business logic: Calculate mood statistics
    return await this.moodRepository.calculateMoodStats(filters);
  }

  /**
   * Get mood trends with business logic
   */
  async getMoodTrends(
    coupleId: string,
    userId: string,
    options: {
      targetUserId?: string;
      period: "week" | "month" | "year";
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any> {
    // Business validation
    if (!coupleId || !userId || !options.period) {
      throw new AppError("Couple ID, user ID, and period are required", 400);
    }

    const validPeriods = ["week", "month", "year"];
    if (!validPeriods.includes(options.period)) {
      throw new AppError("Invalid period. Must be week, month, or year", 400);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Business logic: If targetUserId is specified, verify they're in the couple
    if (options.targetUserId) {
      const isTargetInCouple = await this.coupleRepository.isUserInCouple(
        coupleId,
        options.targetUserId
      );
      if (!isTargetInCouple) {
        throw new AppError("Target user is not a member of this couple", 404);
      }
    }

    // Business logic: Set default date range if not provided
    const now = new Date();
    if (!options.startDate || !options.endDate) {
      switch (options.period) {
        case "week":
          options.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          options.endDate = now;
          break;
        case "month":
          options.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          options.endDate = now;
          break;
        case "year":
          options.startDate = new Date(now.getFullYear(), 0, 1);
          options.endDate = now;
          break;
      }
    }

    const filters: any = { coupleId: new Types.ObjectId(coupleId) };

    if (options.targetUserId) {
      filters.userId = new Types.ObjectId(options.targetUserId);
    }

    if (options.startDate && options.endDate) {
      filters.createdAt = {
        $gte: options.startDate,
        $lte: options.endDate,
      };
    }

    return await this.moodRepository.calculateMoodTrends(
      filters,
      options.period
    );
  }

  /**
   * Get current mood status for couple with business logic
   */
  async getCurrentMoodStatus(coupleId: string, userId: string): Promise<any> {
    // Business validation
    if (!coupleId || !userId) {
      throw new AppError("Couple ID and user ID are required", 400);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Business logic: Get latest moods for both users in the couple
    const couple = await this.coupleRepository.findById(coupleId);
    if (!couple) {
      throw new AppError("Couple not found", 404);
    }

    const userIds = couple.users.map((user: any) => user.toString());
    const moodPromises = userIds.map((id: string) =>
      this.moodRepository.findLatestByUserId(coupleId, id)
    );

    const latestMoods = await Promise.all(moodPromises);

    return {
      coupleId,
      users: userIds.map((id: string, index: number) => ({
        userId: id,
        latestMood: latestMoods[index],
        isCurrentUser: id === userId,
      })),
      timestamp: new Date(),
    };
  }
}
