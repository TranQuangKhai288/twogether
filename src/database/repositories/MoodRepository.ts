import { Types } from "mongoose";
import { Mood, IMood } from "../models/Mood";

export class MoodRepository {
  async create(
    coupleId: string,
    userId: string,
    moodData: {
      mood: string;
      note?: string;
    }
  ): Promise<IMood> {
    const mood = new Mood({
      coupleId: new Types.ObjectId(coupleId),
      userId: new Types.ObjectId(userId),
      ...moodData,
    });
    const savedMood = await mood.save();
    return await savedMood.populate("userId", "name email avatarUrl");
  }

  async findById(moodId: string): Promise<IMood | null> {
    if (!Types.ObjectId.isValid(moodId)) {
      return null;
    }
    return await Mood.findById(moodId).populate(
      "userId",
      "name email avatarUrl"
    );
  }

  /**
   * Find latest mood by user ID
   */
  async findLatestByUserId(
    coupleId: string,
    userId: string
  ): Promise<IMood | null> {
    if (!Types.ObjectId.isValid(coupleId) || !Types.ObjectId.isValid(userId)) {
      return null;
    }

    return await Mood.findOne({
      coupleId: new Types.ObjectId(coupleId),
      userId: new Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .populate("userId", "name email avatarUrl");
  }

  /**
   * Find moods by filters
   */
  async findByFilters(
    filters: any,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ): Promise<IMood[]> {
    let query = Mood.find(filters).populate("userId", "name email avatarUrl");

    // Apply sorting
    if (options.sortBy) {
      const sortDirection = options.sortOrder === "asc" ? 1 : -1;
      query = query.sort({ [options.sortBy]: sortDirection });
    }

    // Apply pagination
    if (options.offset) {
      query = query.skip(options.offset);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    return await query.exec();
  }

  /**
   * Count moods by filters
   */
  async countByFilters(filters: any): Promise<number> {
    return await Mood.countDocuments(filters);
  }

  /**
   * Update mood by ID
   */
  async update(
    moodId: string,
    updateData: Partial<IMood>
  ): Promise<IMood | null> {
    if (!Types.ObjectId.isValid(moodId)) {
      return null;
    }
    return await Mood.findByIdAndUpdate(moodId, updateData, {
      new: true,
      runValidators: true,
    }).populate("userId", "name email avatarUrl");
  }

  /**
   * Delete mood by ID
   */
  async delete(moodId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(moodId)) {
      return false;
    }
    const result = await Mood.findByIdAndDelete(moodId);
    return !!result;
  }

  /**
   * Calculate mood statistics
   */
  async calculateMoodStats(filters: any): Promise<any> {
    const pipeline = [
      { $match: filters },
      {
        $group: {
          _id: "$mood",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 as 1 | -1 } },
    ];

    const moodStats = await Mood.aggregate(pipeline);
    const totalMoods = await this.countByFilters(filters);

    return {
      moodDistribution: moodStats.map((stat: any) => ({
        mood: stat._id,
        count: stat.count,
        percentage:
          totalMoods > 0 ? Math.round((stat.count / totalMoods) * 100) : 0,
      })),
      totalMoods,
    };
  }

  /**
   * Calculate mood trends over time
   */
  async calculateMoodTrends(
    filters: any,
    period: "week" | "month" | "year"
  ): Promise<any> {
    let groupFormat: any;

    switch (period) {
      case "week":
        groupFormat = {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" },
          dayOfYear: { $dayOfYear: "$createdAt" },
        };
        break;
      case "month":
        groupFormat = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        };
        break;
      case "year":
        groupFormat = {
          year: { $year: "$createdAt" },
        };
        break;
    }

    const pipeline = [
      { $match: filters },
      {
        $group: {
          _id: {
            ...groupFormat,
            mood: "$mood",
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.year": 1 as 1 | -1,
          "_id.month": 1 as 1 | -1,
          "_id.week": 1 as 1 | -1,
          "_id.dayOfYear": 1 as 1 | -1,
        },
      },
    ];

    const trends = await Mood.aggregate(pipeline);

    return {
      period,
      data: trends.map((trend: any) => ({
        period: trend._id,
        mood: trend._id.mood,
        count: trend.count,
      })),
    };
  }

  /**
   * Check if mood exists
   */
  async exists(moodId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(moodId)) {
      return false;
    }
    const mood = await Mood.findById(moodId).select("_id");
    return !!mood;
  }
}
