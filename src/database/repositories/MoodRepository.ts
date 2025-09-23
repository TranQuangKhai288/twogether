import { Types } from "mongoose";
import { Mood, IMood } from "../models/Mood";
import { Couple } from "../models/Couple";
import { AppError } from "../../utils/AppError";

export class MoodRepository {
  /**
   * Create a new mood entry
   */
  public static async createMood(
    coupleId: string,
    userId: string,
    moodData: {
      mood: string;
      note?: string;
    }
  ): Promise<IMood> {
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

    // Create mood
    const mood = new Mood({
      coupleId: new Types.ObjectId(coupleId),
      userId: new Types.ObjectId(userId),
      mood: moodData.mood,
      note: moodData.note,
    });

    await mood.save();
    return mood.populate("userId", "name email avatarUrl");
  }

  /**
   * Get latest mood for a user
   */
  public static async getLatestMoodForUser(
    coupleId: string,
    targetUserId: string,
    requestUserId: string
  ): Promise<IMood | null> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, requestUserId);

    const mood = await (Mood as any).getLatestMoodForUser(
      new Types.ObjectId(coupleId),
      new Types.ObjectId(targetUserId)
    );

    if (mood) {
      await mood.populate("userId", "name email avatarUrl");
    }

    return mood;
  }

  /**
   * Get mood history for couple
   */
  public static async getMoodHistory(
    coupleId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      targetUserId?: string;
    } = {}
  ): Promise<{
    moods: IMood[];
    total: number;
  }> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

    let query: any = { coupleId: new Types.ObjectId(coupleId) };

    // Filter by target user
    if (options.targetUserId) {
      query.userId = new Types.ObjectId(options.targetUserId);
    }

    // Filter by date range
    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) query.createdAt.$gte = options.startDate;
      if (options.endDate) query.createdAt.$lte = options.endDate;
    }

    const total = await Mood.countDocuments(query);

    let moodsQuery = Mood.find(query)
      .populate("userId", "name email avatarUrl")
      .sort({ createdAt: -1 });

    if (options.limit) {
      moodsQuery = moodsQuery.limit(options.limit);
    }

    if (options.offset) {
      moodsQuery = moodsQuery.skip(options.offset);
    }

    const moods = await moodsQuery.exec();

    return { moods, total };
  }

  /**
   * Get mood by ID
   */
  public static async getMoodById(
    moodId: string,
    userId: string
  ): Promise<IMood> {
    const mood = await Mood.findById(moodId).populate(
      "userId",
      "name email avatarUrl"
    );
    if (!mood) {
      throw new AppError("Mood not found", 404);
    }

    // Verify user belongs to couple
    await this.verifyCoupleAccess(mood.coupleId.toString(), userId);

    return mood;
  }

  /**
   * Update mood (only by the creator)
   */
  public static async updateMood(
    moodId: string,
    userId: string,
    updateData: {
      mood?: string;
      note?: string;
    }
  ): Promise<IMood> {
    const mood = await Mood.findById(moodId);
    if (!mood) {
      throw new AppError("Mood not found", 404);
    }

    // Verify user belongs to couple
    await this.verifyCoupleAccess(mood.coupleId.toString(), userId);

    // Only the creator can update their mood
    if (mood.userId.toString() !== userId) {
      throw new AppError("You can only update your own mood entries", 403);
    }

    // Update fields
    if (updateData.mood !== undefined) mood.mood = updateData.mood;
    if (updateData.note !== undefined) mood.note = updateData.note;

    await mood.save();
    return mood.populate("userId", "name email avatarUrl");
  }

  /**
   * Delete mood (only by the creator)
   */
  public static async deleteMood(
    moodId: string,
    userId: string
  ): Promise<void> {
    const mood = await Mood.findById(moodId);
    if (!mood) {
      throw new AppError("Mood not found", 404);
    }

    // Verify user belongs to couple
    await this.verifyCoupleAccess(mood.coupleId.toString(), userId);

    // Only the creator can delete their mood
    if (mood.userId.toString() !== userId) {
      throw new AppError("You can only delete your own mood entries", 403);
    }

    await Mood.findByIdAndDelete(moodId);
  }

  /**
   * Get mood statistics for couple
   */
  public static async getMoodStats(
    coupleId: string,
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      targetUserId?: string;
    } = {}
  ): Promise<{
    total: number;
    byUser: { [userId: string]: number };
    byMood: { [mood: string]: number };
    thisWeek: number;
    thisMonth: number;
  }> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

    const coupleObjectId = new Types.ObjectId(coupleId);
    let matchQuery: any = { coupleId: coupleObjectId };

    // Filter by target user
    if (options.targetUserId) {
      matchQuery.userId = new Types.ObjectId(options.targetUserId);
    }

    // Filter by date range
    if (options.startDate || options.endDate) {
      matchQuery.createdAt = {};
      if (options.startDate) matchQuery.createdAt.$gte = options.startDate;
      if (options.endDate) matchQuery.createdAt.$lte = options.endDate;
    }

    const now = new Date();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, thisWeek, thisMonth, userStats, moodStats] =
      await Promise.all([
        Mood.countDocuments(matchQuery),
        Mood.countDocuments({
          ...matchQuery,
          createdAt: { $gte: startOfWeek },
        }),
        Mood.countDocuments({
          ...matchQuery,
          createdAt: { $gte: startOfMonth },
        }),
        Mood.aggregate([
          { $match: matchQuery },
          { $group: { _id: "$userId", count: { $sum: 1 } } },
        ]),
        Mood.aggregate([
          { $match: matchQuery },
          { $group: { _id: "$mood", count: { $sum: 1 } } },
        ]),
      ]);

    const byUser: { [userId: string]: number } = {};
    userStats.forEach((stat: any) => {
      byUser[stat._id.toString()] = stat.count;
    });

    const byMood: { [mood: string]: number } = {};
    moodStats.forEach((stat: any) => {
      byMood[stat._id] = stat.count;
    });

    return { total, byUser, byMood, thisWeek, thisMonth };
  }

  /**
   * Get mood trends over time
   */
  public static async getMoodTrends(
    coupleId: string,
    userId: string,
    options: {
      period: "week" | "month" | "year";
      targetUserId?: string;
    }
  ): Promise<{
    labels: string[];
    data: { [mood: string]: number[] };
  }> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

    const now = new Date();
    let startDate: Date;
    let groupBy: any;
    let periods: string[] = [];

    switch (options.period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        };
        // Generate last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          periods.push(date.toISOString().split("T")[0]);
        }
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        groupBy = {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        };
        // Generate days of current month
        const daysInMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        ).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const date = new Date(now.getFullYear(), now.getMonth(), i);
          periods.push(date.toISOString().split("T")[0]);
        }
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        groupBy = {
          $dateToString: { format: "%Y-%m", date: "$createdAt" },
        };
        // Generate months of current year
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), i, 1);
          periods.push(date.toISOString().substring(0, 7));
        }
        break;
    }

    let matchQuery: any = {
      coupleId: new Types.ObjectId(coupleId),
      createdAt: { $gte: startDate },
    };

    if (options.targetUserId) {
      matchQuery.userId = new Types.ObjectId(options.targetUserId);
    }

    const trends = await Mood.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            period: groupBy,
            mood: "$mood",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.period",
          moods: {
            $push: {
              mood: "$_id.mood",
              count: "$count",
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Process data for chart
    const data: { [mood: string]: number[] } = {};
    const moodSet = new Set<string>();

    // Collect all unique moods
    trends.forEach((trend: any) => {
      trend.moods.forEach((moodData: any) => {
        moodSet.add(moodData.mood);
      });
    });

    // Initialize data structure
    moodSet.forEach((mood) => {
      data[mood] = new Array(periods.length).fill(0);
    });

    // Fill in actual data
    trends.forEach((trend: any) => {
      const periodIndex = periods.indexOf(trend._id);
      if (periodIndex !== -1) {
        trend.moods.forEach((moodData: any) => {
          data[moodData.mood][periodIndex] = moodData.count;
        });
      }
    });

    return { labels: periods, data };
  }

  /**
   * Get current mood status for both users in couple
   */
  public static async getCurrentMoodStatus(
    coupleId: string,
    userId: string
  ): Promise<{
    [userId: string]: {
      latestMood: IMood | null;
      todayMoodCount: number;
    };
  }> {
    // Verify user belongs to couple
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result: any = {};

    for (const coupleUserId of couple.users) {
      const [latestMood, todayMoodCount] = await Promise.all([
        (Mood as any).getLatestMoodForUser(
          new Types.ObjectId(coupleId),
          coupleUserId
        ),
        Mood.countDocuments({
          coupleId: new Types.ObjectId(coupleId),
          userId: coupleUserId,
          createdAt: { $gte: today, $lt: tomorrow },
        }),
      ]);

      if (latestMood) {
        await latestMood.populate("userId", "name email avatarUrl");
      }

      result[coupleUserId.toString()] = {
        latestMood,
        todayMoodCount,
      };
    }

    return result;
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
