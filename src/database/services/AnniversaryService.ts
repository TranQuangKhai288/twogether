import { Types } from "mongoose";
import { Anniversary, IAnniversary } from "../models/Anniversary";
import { Couple } from "../models/Couple";
import { AppError } from "../../utils/AppError";

export class AnniversaryService {
  /**
   * Create a new anniversary
   */
  public static async createAnniversary(
    coupleId: string,
    userId: string,
    anniversaryData: {
      title: string;
      date: Date;
      remindBefore?: number;
      repeatAnnually?: boolean;
    }
  ): Promise<IAnniversary> {
    // Verify couple exists and user belongs to it
    const couple = await Couple.findById(coupleId);
    if (!couple) {
      throw new AppError("Couple not found", 404);
    }

    const userInCouple = couple.users.some(
      (user) => user.toString() === userId
    );
    if (!userInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Create anniversary
    const anniversary = new Anniversary({
      coupleId: new Types.ObjectId(coupleId),
      title: anniversaryData.title,
      date: anniversaryData.date,
      remindBefore: anniversaryData.remindBefore ?? 1,
      repeatAnnually: anniversaryData.repeatAnnually ?? false,
    });

    await anniversary.save();
    return anniversary;
  }

  /**
   * Get all anniversaries for a couple
   */
  public static async getCoupleAnniversaries(
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
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

    let query: any = { coupleId: new Types.ObjectId(coupleId) };

    // Filter by year
    if (options.year) {
      const startOfYear = new Date(options.year, 0, 1);
      const endOfYear = new Date(options.year + 1, 0, 1);
      query.date = { $gte: startOfYear, $lt: endOfYear };
    }

    // Filter upcoming anniversaries
    if (options.upcoming) {
      const now = new Date();
      const nextYear = new Date(
        now.getFullYear() + 1,
        now.getMonth(),
        now.getDate()
      );
      query.date = { $gte: now, $lte: nextYear };
    }

    const total = await Anniversary.countDocuments(query);

    let anniversariesQuery = Anniversary.find(query).sort({ date: 1 });

    if (options.limit) {
      anniversariesQuery = anniversariesQuery.limit(options.limit);
    }

    if (options.offset) {
      anniversariesQuery = anniversariesQuery.skip(options.offset);
    }

    const anniversaries = await anniversariesQuery.exec();

    const result: any = { anniversaries, total };

    // Get upcoming count if requested
    if (options.upcoming !== true) {
      const now = new Date();
      const nextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate()
      );
      const upcomingCount = await Anniversary.countDocuments({
        coupleId: new Types.ObjectId(coupleId),
        date: { $gte: now, $lte: nextMonth },
      });
      result.upcomingCount = upcomingCount;
    }

    return result;
  }

  /**
   * Get anniversary by ID
   */
  public static async getAnniversaryById(
    anniversaryId: string,
    userId: string
  ): Promise<IAnniversary> {
    const anniversary = await Anniversary.findById(anniversaryId);
    if (!anniversary) {
      throw new AppError("Anniversary not found", 404);
    }

    // Verify user belongs to couple
    await this.verifyCoupleAccess(anniversary.coupleId.toString(), userId);

    return anniversary;
  }

  /**
   * Update anniversary
   */
  public static async updateAnniversary(
    anniversaryId: string,
    userId: string,
    updateData: {
      title?: string;
      date?: Date;
      remindBefore?: number;
      repeatAnnually?: boolean;
    }
  ): Promise<IAnniversary> {
    const anniversary = await Anniversary.findById(anniversaryId);
    if (!anniversary) {
      throw new AppError("Anniversary not found", 404);
    }

    // Verify user belongs to couple
    await this.verifyCoupleAccess(anniversary.coupleId.toString(), userId);

    // Update fields
    if (updateData.title !== undefined) anniversary.title = updateData.title;
    if (updateData.date !== undefined) anniversary.date = updateData.date;
    if (updateData.remindBefore !== undefined)
      anniversary.remindBefore = updateData.remindBefore;
    if (updateData.repeatAnnually !== undefined)
      anniversary.repeatAnnually = updateData.repeatAnnually;

    await anniversary.save();
    return anniversary;
  }

  /**
   * Delete anniversary
   */
  public static async deleteAnniversary(
    anniversaryId: string,
    userId: string
  ): Promise<void> {
    const anniversary = await Anniversary.findById(anniversaryId);
    if (!anniversary) {
      throw new AppError("Anniversary not found", 404);
    }

    // Verify user belongs to couple
    await this.verifyCoupleAccess(anniversary.coupleId.toString(), userId);

    await Anniversary.findByIdAndDelete(anniversaryId);
  }

  /**
   * Get upcoming anniversaries (within next 30 days)
   */
  public static async getUpcomingAnniversaries(
    coupleId: string,
    userId: string,
    days: number = 30
  ): Promise<IAnniversary[]> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const anniversaries = await Anniversary.find({
      coupleId: new Types.ObjectId(coupleId),
      date: { $gte: now, $lte: futureDate },
    }).sort({ date: 1 });

    return anniversaries;
  }

  /**
   * Get anniversaries by date range
   */
  public static async getAnniversariesByDateRange(
    coupleId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IAnniversary[]> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

    const anniversaries = await Anniversary.find({
      coupleId: new Types.ObjectId(coupleId),
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    return anniversaries;
  }

  /**
   * Get anniversary statistics
   */
  public static async getAnniversaryStats(
    coupleId: string,
    userId: string
  ): Promise<{
    total: number;
    upcoming: number;
    thisMonth: number;
    repeating: number;
  }> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

    const coupleObjectId = new Types.ObjectId(coupleId);
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [total, upcoming, thisMonth, repeating] = await Promise.all([
      Anniversary.countDocuments({ coupleId: coupleObjectId }),
      Anniversary.countDocuments({
        coupleId: coupleObjectId,
        date: { $gte: now, $lte: next30Days },
      }),
      Anniversary.countDocuments({
        coupleId: coupleObjectId,
        date: { $gte: now, $lte: endOfMonth },
      }),
      Anniversary.countDocuments({
        coupleId: coupleObjectId,
        repeatAnnually: true,
      }),
    ]);

    return { total, upcoming, thisMonth, repeating };
  }

  /**
   * Helper method to verify couple access
   */
  private static async verifyCoupleAccess(
    coupleId: string,
    userId: string
  ): Promise<void> {
    const couple = await Couple.findById(coupleId);
    if (!couple) {
      throw new AppError("Couple not found", 404);
    }

    const userInCouple = couple.users.some(
      (user) => user.toString() === userId
    );
    if (!userInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }
  }
}
