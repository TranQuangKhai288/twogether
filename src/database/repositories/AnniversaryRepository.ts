import { Types } from "mongoose";
import { Anniversary, IAnniversary } from "../models/Anniversary";
import { AppError } from "../../utils/AppError";

export class AnniversaryRepository {
  /**
   * Create a new anniversary
   */
  async create(anniversaryData: {
    coupleId: string;
    title: string;
    date: Date;
    remindBefore?: number;
    repeatAnnually?: boolean;
  }): Promise<IAnniversary> {
    try {
      const anniversary = new Anniversary({
        coupleId: new Types.ObjectId(anniversaryData.coupleId),
        title: anniversaryData.title,
        date: anniversaryData.date,
        remindBefore: anniversaryData.remindBefore ?? 1,
        repeatAnnually: anniversaryData.repeatAnnually ?? false,
      });

      await anniversary.save();
      return anniversary;
    } catch (error) {
      throw new AppError("Failed to create anniversary", 500);
    }
  }

  /**
   * Find anniversary by ID
   */
  async findById(anniversaryId: string): Promise<IAnniversary | null> {
    try {
      if (!Types.ObjectId.isValid(anniversaryId)) {
        return null;
      }
      return await Anniversary.findById(anniversaryId);
    } catch (error) {
      throw new AppError("Failed to find anniversary", 500);
    }
  }

  /**
   * Find anniversaries by couple ID
   */
  async findByCoupleId(
    coupleId: string,
    options: {
      year?: number;
      upcoming?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    anniversaries: IAnniversary[];
    total: number;
  }> {
    try {
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

      return { anniversaries, total };
    } catch (error) {
      throw new AppError("Failed to find anniversaries by couple", 500);
    }
  }

  /**
   * Update anniversary
   */
  async update(
    anniversaryId: string,
    updateData: {
      title?: string;
      date?: Date;
      remindBefore?: number;
      repeatAnnually?: boolean;
    }
  ): Promise<IAnniversary | null> {
    try {
      return await Anniversary.findByIdAndUpdate(
        anniversaryId,
        { $set: updateData },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new AppError("Failed to update anniversary", 500);
    }
  }

  /**
   * Delete anniversary
   */
  async delete(anniversaryId: string): Promise<boolean> {
    try {
      const result = await Anniversary.findByIdAndDelete(anniversaryId);
      return !!result;
    } catch (error) {
      throw new AppError("Failed to delete anniversary", 500);
    }
  }

  /**
   * Find upcoming anniversaries
   */
  async findUpcoming(
    coupleId: string,
    days: number = 30
  ): Promise<IAnniversary[]> {
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      return await Anniversary.find({
        coupleId: new Types.ObjectId(coupleId),
        date: { $gte: now, $lte: futureDate },
      }).sort({ date: 1 });
    } catch (error) {
      throw new AppError("Failed to find upcoming anniversaries", 500);
    }
  }

  /**
   * Find anniversaries by date range
   */
  async findByDateRange(
    coupleId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IAnniversary[]> {
    try {
      return await Anniversary.find({
        coupleId: new Types.ObjectId(coupleId),
        date: { $gte: startDate, $lte: endDate },
      }).sort({ date: 1 });
    } catch (error) {
      throw new AppError("Failed to find anniversaries by date range", 500);
    }
  }

  /**
   * Get anniversary statistics
   */
  async getStatistics(coupleId: string): Promise<{
    total: number;
    upcoming: number;
    thisMonth: number;
    repeating: number;
  }> {
    try {
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
    } catch (error) {
      throw new AppError("Failed to get anniversary statistics", 500);
    }
  }

  /**
   * Check if anniversary exists
   */
  async exists(anniversaryId: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(anniversaryId)) {
        return false;
      }
      const anniversary =
        await Anniversary.findById(anniversaryId).select("_id");
      return !!anniversary;
    } catch (error) {
      return false;
    }
  }
}
