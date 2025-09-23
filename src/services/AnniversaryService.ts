import { Types } from "mongoose";
import { IAnniversary } from "@/database/models/Anniversary";
import { AnniversaryRepository } from "@/database/repositories/AnniversaryRepository";
import { CoupleRepository } from "@/database/repositories/CoupleRepository";
import { IAnniversaryService } from "./interfaces";
import { AppError } from "@/utils/AppError";

export class AnniversaryService implements IAnniversaryService {
  private anniversaryRepository: AnniversaryRepository;
  private coupleRepository: CoupleRepository;

  constructor() {
    this.anniversaryRepository = new AnniversaryRepository();
    this.coupleRepository = new CoupleRepository();
  }

  /**
   * Create anniversary with business logic validation
   */
  async createAnniversary(
    coupleId: string,
    userId: string,
    anniversaryData: {
      title: string;
      date: Date;
      remindBefore?: number;
      repeatAnnually?: boolean;
    }
  ): Promise<IAnniversary> {
    // Business validation
    if (
      !coupleId ||
      !userId ||
      !anniversaryData.title ||
      !anniversaryData.date
    ) {
      throw new AppError(
        "Couple ID, user ID, title, and date are required",
        400
      );
    }

    if (!Types.ObjectId.isValid(coupleId) || !Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid ID format", 400);
    }

    // Verify couple exists and user belongs to it (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Business logic: Validate date
    if (anniversaryData.date > new Date()) {
      // Future date is OK for anniversaries
    }

    // Business logic: Set defaults
    const anniversaryDataWithDefaults = {
      title: anniversaryData.title,
      date: anniversaryData.date,
      remindBefore: anniversaryData.remindBefore ?? 1,
      repeatAnnually: anniversaryData.repeatAnnually ?? false,
    };

    return await this.anniversaryRepository.create(
      coupleId,
      anniversaryDataWithDefaults
    );
  }

  /**
   * Get couple anniversaries with business logic
   */
  async getCoupleAnniversaries(
    coupleId: string,
    userId: string,
    options: {
      year?: number;
      upcoming?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    anniversaries: IAnniversary[];
    total: number;
    upcomingCount?: number;
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

    // Business logic: Build query filters
    const filters: any = { coupleId: new Types.ObjectId(coupleId) };

    if (options.year) {
      const startOfYear = new Date(options.year, 0, 1);
      const endOfYear = new Date(options.year + 1, 0, 1);
      filters.date = { $gte: startOfYear, $lt: endOfYear };
    }

    if (options.upcoming) {
      const now = new Date();
      const nextYear = new Date(
        now.getFullYear() + 1,
        now.getMonth(),
        now.getDate()
      );
      filters.date = { $gte: now, $lte: nextYear };
    }

    const [anniversaries, total] = await Promise.all([
      this.anniversaryRepository.findByFilters(filters, {
        limit: options.limit,
        offset: options.offset,
        sortBy: "date",
        sortOrder: "asc",
      }),
      this.anniversaryRepository.countByFilters(filters),
    ]);

    const result: any = { anniversaries, total };

    // Business logic: Get upcoming count if not already filtering for upcoming
    if (!options.upcoming) {
      const now = new Date();
      const nextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate()
      );
      const upcomingFilters = {
        coupleId: new Types.ObjectId(coupleId),
        date: { $gte: now, $lte: nextMonth },
      };
      result.upcomingCount =
        await this.anniversaryRepository.countByFilters(upcomingFilters);
    }

    return result;
  }

  /**
   * Get anniversary by ID with business logic
   */
  async getAnniversaryById(
    anniversaryId: string,
    userId: string
  ): Promise<IAnniversary> {
    // Business validation
    if (!anniversaryId || !userId) {
      throw new AppError("Anniversary ID and user ID are required", 400);
    }

    if (
      !Types.ObjectId.isValid(anniversaryId) ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw new AppError("Invalid ID format", 400);
    }

    // Get anniversary (business logic)
    const anniversary =
      await this.anniversaryRepository.findById(anniversaryId);
    if (!anniversary) {
      throw new AppError("Anniversary not found", 404);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      anniversary.coupleId.toString(),
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    return anniversary;
  }

  /**
   * Update anniversary with business logic
   */
  async updateAnniversary(
    anniversaryId: string,
    userId: string,
    updateData: {
      title?: string;
      date?: Date;
      remindBefore?: number;
      repeatAnnually?: boolean;
    }
  ): Promise<IAnniversary> {
    // Business validation
    if (!anniversaryId || !userId) {
      throw new AppError("Anniversary ID and user ID are required", 400);
    }

    if (
      !Types.ObjectId.isValid(anniversaryId) ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw new AppError("Invalid ID format", 400);
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      throw new AppError("Update data is required", 400);
    }

    // Get anniversary and verify access (business logic)
    const anniversary =
      await this.anniversaryRepository.findById(anniversaryId);
    if (!anniversary) {
      throw new AppError("Anniversary not found", 404);
    }

    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      anniversary.coupleId.toString(),
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    const updatedAnniversary = await this.anniversaryRepository.update(
      anniversaryId,
      updateData
    );
    if (!updatedAnniversary) {
      throw new AppError("Failed to update anniversary", 500);
    }

    return updatedAnniversary;
  }

  /**
   * Delete anniversary with business logic
   */
  async deleteAnniversary(
    anniversaryId: string,
    userId: string
  ): Promise<boolean> {
    // Business validation
    if (!anniversaryId || !userId) {
      throw new AppError("Anniversary ID and user ID are required", 400);
    }

    if (
      !Types.ObjectId.isValid(anniversaryId) ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw new AppError("Invalid ID format", 400);
    }

    // Get anniversary and verify access (business logic)
    const anniversary =
      await this.anniversaryRepository.findById(anniversaryId);
    if (!anniversary) {
      throw new AppError("Anniversary not found", 404);
    }

    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      anniversary.coupleId.toString(),
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    return await this.anniversaryRepository.delete(anniversaryId);
  }

  /**
   * Get upcoming anniversaries with business logic
   */
  async getUpcomingAnniversaries(
    coupleId: string,
    userId: string,
    days: number = 30
  ): Promise<IAnniversary[]> {
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

    // Business logic: Get anniversaries in next N days
    const now = new Date();
    const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const filters = {
      coupleId: new Types.ObjectId(coupleId),
      date: { $gte: now, $lte: targetDate },
    };

    return await this.anniversaryRepository.findByFilters(filters, {
      sortBy: "date",
      sortOrder: "asc",
    });
  }

  /**
   * Get anniversaries by date range with business logic
   */
  async getAnniversariesByDateRange(
    coupleId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IAnniversary[]> {
    // Business validation
    if (!coupleId || !userId || !startDate || !endDate) {
      throw new AppError(
        "Couple ID, user ID, start date, and end date are required",
        400
      );
    }

    if (startDate >= endDate) {
      throw new AppError("Start date must be before end date", 400);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    const filters = {
      coupleId: new Types.ObjectId(coupleId),
      date: { $gte: startDate, $lte: endDate },
    };

    return await this.anniversaryRepository.findByFilters(filters, {
      sortBy: "date",
      sortOrder: "asc",
    });
  }

  /**
   * Get anniversary statistics with business logic
   */
  async getAnniversaryStats(coupleId: string, userId: string): Promise<any> {
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

    // Business logic: Calculate various statistics
    const coupleObjectId = new Types.ObjectId(coupleId);
    const now = new Date();

    const [totalCount, upcomingCount, thisYearCount, repeatAnnuallyCount] =
      await Promise.all([
        this.anniversaryRepository.countByFilters({ coupleId: coupleObjectId }),
        this.anniversaryRepository.countByFilters({
          coupleId: coupleObjectId,
          date: { $gte: now },
        }),
        this.anniversaryRepository.countByFilters({
          coupleId: coupleObjectId,
          date: {
            $gte: new Date(now.getFullYear(), 0, 1),
            $lt: new Date(now.getFullYear() + 1, 0, 1),
          },
        }),
        this.anniversaryRepository.countByFilters({
          coupleId: coupleObjectId,
          repeatAnnually: true,
        }),
      ]);

    return {
      total: totalCount,
      upcoming: upcomingCount,
      thisYear: thisYearCount,
      repeating: repeatAnnuallyCount,
    };
  }
}
