import { Types } from "mongoose";
import { Mood, IMood } from "../models/Mood";
import { AppError } from "../../utils/AppError";

export class MoodRepository {
  /**
   * Create a new mood entry
   */
  async create(moodData: {
    coupleId: string;
    userId: string;
    mood: "very-happy" | "happy" | "neutral" | "sad" | "very-sad";
    note?: string;
  }): Promise<IMood> {
    try {
      const mood = new Mood({
        coupleId: new Types.ObjectId(moodData.coupleId),
        userId: new Types.ObjectId(moodData.userId),
        mood: moodData.mood,
        note: moodData.note,
      });

      await mood.save();
      return mood.populate("userId", "name email");
    } catch (error) {
      throw new AppError("Failed to create mood entry", 500);
    }
  }

  /**
   * Find mood by ID
   */
  async findById(moodId: string): Promise<IMood | null> {
    try {
      if (!Types.ObjectId.isValid(moodId)) {
        return null;
      }
      return await Mood.findById(moodId).populate("userId", "name email");
    } catch (error) {
      throw new AppError("Failed to find mood entry", 500);
    }
  }

  /**
   * Find moods by couple ID
   */
  async findByCoupleId(
    coupleId: string,
    options: {
      userId?: string;
      mood?: "very-happy" | "happy" | "neutral" | "sad" | "very-sad";
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
      sortBy?: "newest" | "oldest";
    } = {}
  ): Promise<{
    moods: IMood[];
    total: number;
  }> {
    try {
      let query: any = { coupleId: new Types.ObjectId(coupleId) };

      if (options.userId) {
        query.userId = new Types.ObjectId(options.userId);
      }

      if (options.mood) {
        query.mood = options.mood;
      }

      if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) {
          query.createdAt.$gte = options.startDate;
        }
        if (options.endDate) {
          query.createdAt.$lte = options.endDate;
        }
      }

      const total = await Mood.countDocuments(query);

      let moodsQuery = Mood.find(query).populate("userId", "name email");

      const sortOrder = options.sortBy === "oldest" ? 1 : -1;
      moodsQuery = moodsQuery.sort({ createdAt: sortOrder });

      if (options.limit) {
        moodsQuery = moodsQuery.limit(options.limit);
      }

      if (options.offset) {
        moodsQuery = moodsQuery.skip(options.offset);
      }

      const moods = await moodsQuery.exec();

      return { moods, total };
    } catch (error) {
      throw new AppError("Failed to find moods by couple", 500);
    }
  }

  /**
   * Update mood entry
   */
  async update(
    moodId: string,
    updateData: {
      mood?: "very-happy" | "happy" | "neutral" | "sad" | "very-sad";
      note?: string;
    }
  ): Promise<IMood | null> {
    try {
      return await Mood.findByIdAndUpdate(
        moodId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate("userId", "name email");
    } catch (error) {
      throw new AppError("Failed to update mood entry", 500);
    }
  }

  /**
   * Delete mood entry
   */
  async delete(moodId: string): Promise<boolean> {
    try {
      const result = await Mood.findByIdAndDelete(moodId);
      return !!result;
    } catch (error) {
      throw new AppError("Failed to delete mood entry", 500);
    }
  }

  /**
   * Get today's mood for a user
   */
  async getTodayMood(coupleId: string, userId: string): Promise<IMood | null> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await Mood.findOne({
        coupleId: new Types.ObjectId(coupleId),
        userId: new Types.ObjectId(userId),
        createdAt: {
          $gte: today,
          $lt: tomorrow,
        },
      }).populate("userId", "name email");
    } catch (error) {
      throw new AppError("Failed to get today's mood", 500);
    }
  }

  /**
   * Get mood trends for a period
   */
  async getMoodTrends(
    coupleId: string,
    options: {
      userId?: string;
      days?: number; // Default 30 days
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    trends: {
      date: string;
      "very-happy": number;
      happy: number;
      neutral: number;
      sad: number;
      "very-sad": number;
      total: number;
    }[];
    averageMood: number;
  }> {
    try {
      let startDate = options.startDate;
      let endDate = options.endDate;

      if (!startDate || !endDate) {
        const days = options.days || 30;
        endDate = endDate || new Date();
        startDate =
          startDate || new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      }

      let matchQuery: any = {
        coupleId: new Types.ObjectId(coupleId),
        createdAt: { $gte: startDate, $lte: endDate },
      };

      if (options.userId) {
        matchQuery.userId = new Types.ObjectId(options.userId);
      }

      const trends = await Mood.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },
              mood: "$mood",
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.date",
            moods: {
              $push: {
                mood: "$_id.mood",
                count: "$count",
              },
            },
            total: { $sum: "$count" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const formattedTrends = trends.map((trend: any) => {
        const moodCounts = {
          "very-happy": 0,
          happy: 0,
          neutral: 0,
          sad: 0,
          "very-sad": 0,
        };

        trend.moods.forEach((mood: any) => {
          moodCounts[mood.mood as keyof typeof moodCounts] = mood.count;
        });

        return {
          date: trend._id,
          ...moodCounts,
          total: trend.total,
        };
      });

      // Calculate average mood (1=very-sad, 5=very-happy)
      const moodValues = {
        "very-sad": 1,
        sad: 2,
        neutral: 3,
        happy: 4,
        "very-happy": 5,
      };
      let totalMoodValue = 0;
      let totalEntries = 0;

      formattedTrends.forEach((trend) => {
        Object.entries(moodValues).forEach(([mood, value]) => {
          const count = trend[mood as keyof typeof trend] as number;
          totalMoodValue += count * value;
          totalEntries += count;
        });
      });

      const averageMood = totalEntries > 0 ? totalMoodValue / totalEntries : 0;

      return { trends: formattedTrends, averageMood };
    } catch (error) {
      throw new AppError("Failed to get mood trends", 500);
    }
  }

  /**
   * Get mood statistics
   */
  async getStatistics(
    coupleId: string,
    options: {
      userId?: string;
      days?: number;
    } = {}
  ): Promise<{
    total: number;
    thisWeek: number;
    averageMood: number;
    moodDistribution: {
      "very-happy": number;
      happy: number;
      neutral: number;
      sad: number;
      "very-sad": number;
    };
    streak: number; // Current consecutive days with mood entries
  }> {
    try {
      const days = options.days || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      let matchQuery: any = { coupleId: new Types.ObjectId(coupleId) };
      let recentMatchQuery: any = {
        coupleId: new Types.ObjectId(coupleId),
        createdAt: { $gte: startDate },
      };
      let weekMatchQuery: any = {
        coupleId: new Types.ObjectId(coupleId),
        createdAt: { $gte: startOfWeek },
      };

      if (options.userId) {
        matchQuery.userId = new Types.ObjectId(options.userId);
        recentMatchQuery.userId = new Types.ObjectId(options.userId);
        weekMatchQuery.userId = new Types.ObjectId(options.userId);
      }

      const [total, thisWeek, moodStats, streakData] = await Promise.all([
        Mood.countDocuments(recentMatchQuery),
        Mood.countDocuments(weekMatchQuery),
        Mood.aggregate([
          { $match: recentMatchQuery },
          { $group: { _id: "$mood", count: { $sum: 1 } } },
        ]),
        this.calculateStreak(coupleId, options.userId),
      ]);

      const moodDistribution = {
        "very-happy": 0,
        happy: 0,
        neutral: 0,
        sad: 0,
        "very-sad": 0,
      };

      let totalMoodValue = 0;
      moodStats.forEach((stat: any) => {
        moodDistribution[stat._id as keyof typeof moodDistribution] =
          stat.count;
        const moodValues = {
          "very-sad": 1,
          sad: 2,
          neutral: 3,
          happy: 4,
          "very-happy": 5,
        };
        totalMoodValue +=
          stat.count * moodValues[stat._id as keyof typeof moodValues];
      });

      const averageMood = total > 0 ? totalMoodValue / total : 0;

      return {
        total,
        thisWeek,
        averageMood,
        moodDistribution,
        streak: streakData,
      };
    } catch (error) {
      throw new AppError("Failed to get mood statistics", 500);
    }
  }

  /**
   * Calculate current streak of consecutive days with mood entries
   */
  private async calculateStreak(
    coupleId: string,
    userId?: string
  ): Promise<number> {
    try {
      let matchQuery: any = { coupleId: new Types.ObjectId(coupleId) };
      if (userId) {
        matchQuery.userId = new Types.ObjectId(userId);
      }

      const recentMoods = await Mood.find(matchQuery)
        .sort({ createdAt: -1 })
        .limit(100)
        .select("createdAt");

      if (recentMoods.length === 0) return 0;

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const moodDates = recentMoods.map((mood) => {
        const moodObj = mood.toObject();
        const date = new Date(moodObj.createdAt);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      });

      const uniqueDates = [...new Set(moodDates)].sort((a, b) => b - a);

      let currentDate = today.getTime();
      for (const moodDate of uniqueDates) {
        if (moodDate === currentDate) {
          streak++;
          currentDate -= 24 * 60 * 60 * 1000; // Go to previous day
        } else if (moodDate === currentDate + 24 * 60 * 60 * 1000) {
          // If we haven't tracked today yet, but tracked yesterday
          streak++;
          currentDate = moodDate - 24 * 60 * 60 * 1000;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if mood exists
   */
  async exists(moodId: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(moodId)) {
        return false;
      }
      const mood = await Mood.findById(moodId).select("_id");
      return !!mood;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get mood by user and date
   */
  async findByUserAndDate(
    coupleId: string,
    userId: string,
    date: Date
  ): Promise<IMood | null> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      return await Mood.findOne({
        coupleId: new Types.ObjectId(coupleId),
        userId: new Types.ObjectId(userId),
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      }).populate("userId", "name email");
    } catch (error) {
      throw new AppError("Failed to find mood by user and date", 500);
    }
  }
}
