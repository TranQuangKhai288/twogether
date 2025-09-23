import { Request, Response } from "express";
import { ApiResponse } from "../types/index";
import { AppError } from "../utils/AppError";
import { MoodRepository } from "../database/repositories/MoodRepository";
import { asyncHandler } from "../utils/asyncHandler";

export class MoodController {
  /**
   * Create a new mood entry
   */
  public createMood = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId, mood, note } = req.body;

      if (!coupleId || !mood) {
        throw new AppError("Couple ID and mood are required", 400);
      }

      const moodEntry = await MoodRepository.createMood(coupleId, userId, {
        mood,
        note,
      });

      const response: ApiResponse = {
        success: true,
        message: "Mood created successfully",
        data: {
          id: moodEntry._id,
          coupleId: moodEntry.coupleId,
          user: moodEntry.userId,
          mood: moodEntry.mood,
          note: moodEntry.note,
          createdAt: moodEntry.createdAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    }
  );

  /**
   * Get latest mood for a user
   */
  public getLatestMoodForUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const requestUserId = req.user!._id.toString();
      const { coupleId, userId } = req.params;

      const mood = await MoodRepository.getLatestMoodForUser(
        coupleId,
        userId,
        requestUserId
      );

      const response: ApiResponse = {
        success: true,
        message: "Latest mood retrieved successfully",
        data: mood
          ? {
              id: mood._id,
              coupleId: mood.coupleId,
              user: mood.userId,
              mood: mood.mood,
              note: mood.note,
              createdAt: mood.createdAt,
            }
          : null,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get mood history for couple
   */
  public getMoodHistory = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;
      const { limit, offset, startDate, endDate, targetUserId } = req.query;

      const options = {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        targetUserId: targetUserId as string,
      };

      const result = await MoodRepository.getMoodHistory(
        coupleId,
        userId,
        options
      );

      const response: ApiResponse = {
        success: true,
        message: "Mood history retrieved successfully",
        data: {
          moods: result.moods.map((mood) => ({
            id: mood._id,
            coupleId: mood.coupleId,
            user: mood.userId,
            mood: mood.mood,
            note: mood.note,
            createdAt: mood.createdAt,
          })),
          total: result.total,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get mood by ID
   */
  public getMoodById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const mood = await MoodRepository.getMoodById(id, userId);

      const response: ApiResponse = {
        success: true,
        message: "Mood retrieved successfully",
        data: {
          id: mood._id,
          coupleId: mood.coupleId,
          user: mood.userId,
          mood: mood.mood,
          note: mood.note,
          createdAt: mood.createdAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update mood
   */
  public updateMood = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { id } = req.params;
      const { mood, note } = req.body;

      const updateData: any = {};
      if (mood !== undefined) updateData.mood = mood;
      if (note !== undefined) updateData.note = note;

      const updatedMood = await MoodRepository.updateMood(
        id,
        userId,
        updateData
      );

      const response: ApiResponse = {
        success: true,
        message: "Mood updated successfully",
        data: {
          id: updatedMood._id,
          coupleId: updatedMood.coupleId,
          user: updatedMood.userId,
          mood: updatedMood.mood,
          note: updatedMood.note,
          createdAt: updatedMood.createdAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Delete mood
   */
  public deleteMood = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      await MoodRepository.deleteMood(id, userId);

      const response: ApiResponse = {
        success: true,
        message: "Mood deleted successfully",
        data: null,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get mood statistics
   */
  public getMoodStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;
      const { startDate, endDate, targetUserId } = req.query;

      const options = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        targetUserId: targetUserId as string,
      };

      const stats = await MoodRepository.getMoodStats(
        coupleId,
        userId,
        options
      );

      const response: ApiResponse = {
        success: true,
        message: "Mood statistics retrieved successfully",
        data: stats,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get mood trends
   */
  public getMoodTrends = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;
      const { period, targetUserId } = req.query;

      if (!period || !["week", "month", "year"].includes(period as string)) {
        throw new AppError("Period must be 'week', 'month', or 'year'", 400);
      }

      const options = {
        period: period as "week" | "month" | "year",
        targetUserId: targetUserId as string,
      };

      const trends = await MoodRepository.getMoodTrends(
        coupleId,
        userId,
        options
      );

      const response: ApiResponse = {
        success: true,
        message: "Mood trends retrieved successfully",
        data: {
          period: options.period,
          labels: trends.labels,
          datasets: Object.entries(trends.data).map(([mood, data]) => ({
            mood,
            data,
          })),
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get current mood status for couple
   */
  public getCurrentMoodStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;

      const status = await MoodRepository.getCurrentMoodStatus(
        coupleId,
        userId
      );

      // Transform the data to be more user-friendly
      const transformedStatus = Object.entries(status).map(
        ([userId, data]) => ({
          userId,
          latestMood: data.latestMood
            ? {
                id: data.latestMood._id,
                mood: data.latestMood.mood,
                note: data.latestMood.note,
                createdAt: data.latestMood.createdAt,
                user: data.latestMood.userId,
              }
            : null,
          todayMoodCount: data.todayMoodCount,
        })
      );

      const response: ApiResponse = {
        success: true,
        message: "Current mood status retrieved successfully",
        data: transformedStatus,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );
}
