import { Request, Response } from "express";
import { ApiResponse } from "../types/index";
import { AppError } from "../utils/AppError";
import { AnniversaryService } from "../services/AnniversaryService";
import { asyncHandler } from "../utils/asyncHandler";

export class AnniversaryController {
  private anniversaryService: AnniversaryService;

  constructor() {
    this.anniversaryService = new AnniversaryService();
  }
  /**
   * Create a new anniversary
   */
  public createAnniversary = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId, title, date, remindBefore, repeatAnnually } = req.body;

      if (!coupleId || !title || !date) {
        throw new AppError("Couple ID, title, and date are required", 400);
      }

      const anniversary = await this.anniversaryService.createAnniversary(
        coupleId,
        userId,
        {
          title,
          date: new Date(date),
          remindBefore,
          repeatAnnually,
        }
      );

      const response: ApiResponse = {
        success: true,
        message: "Anniversary created successfully",
        data: {
          id: anniversary._id,
          coupleId: anniversary.coupleId,
          title: anniversary.title,
          date: anniversary.date,
          remindBefore: anniversary.remindBefore,
          repeatAnnually: anniversary.repeatAnnually,
          createdAt: anniversary.createdAt,
          updatedAt: anniversary.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    }
  );

  /**
   * Get anniversaries for couple
   */
  public getCoupleAnniversaries = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;
      const { year, upcoming, limit, offset } = req.query;

      const options = {
        year: year ? parseInt(year as string) : undefined,
        upcoming: upcoming === "true",
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const result = await this.anniversaryService.getCoupleAnniversaries(
        coupleId,
        userId,
        options
      );

      const response: ApiResponse = {
        success: true,
        message: "Anniversaries retrieved successfully",
        data: {
          anniversaries: result.anniversaries.map((anniversary) => ({
            id: anniversary._id,
            coupleId: anniversary.coupleId,
            title: anniversary.title,
            date: anniversary.date,
            remindBefore: anniversary.remindBefore,
            repeatAnnually: anniversary.repeatAnnually,
            createdAt: anniversary.createdAt,
            updatedAt: anniversary.updatedAt,
          })),
          total: result.total,
          upcomingCount: result.upcomingCount,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get anniversary by ID
   */
  public getAnniversaryById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const anniversary = await this.anniversaryService.getAnniversaryById(
        id,
        userId
      );

      const response: ApiResponse = {
        success: true,
        message: "Anniversary retrieved successfully",
        data: {
          id: anniversary._id,
          coupleId: anniversary.coupleId,
          title: anniversary.title,
          date: anniversary.date,
          remindBefore: anniversary.remindBefore,
          repeatAnnually: anniversary.repeatAnnually,
          createdAt: anniversary.createdAt,
          updatedAt: anniversary.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update anniversary
   */
  public updateAnniversary = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { id } = req.params;
      const { title, date, remindBefore, repeatAnnually } = req.body;

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (date !== undefined) updateData.date = new Date(date);
      if (remindBefore !== undefined) updateData.remindBefore = remindBefore;
      if (repeatAnnually !== undefined)
        updateData.repeatAnnually = repeatAnnually;

      const anniversary = await this.anniversaryService.updateAnniversary(
        id,
        userId,
        updateData
      );

      const response: ApiResponse = {
        success: true,
        message: "Anniversary updated successfully",
        data: {
          id: anniversary._id,
          coupleId: anniversary.coupleId,
          title: anniversary.title,
          date: anniversary.date,
          remindBefore: anniversary.remindBefore,
          repeatAnnually: anniversary.repeatAnnually,
          createdAt: anniversary.createdAt,
          updatedAt: anniversary.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Delete anniversary
   */
  public deleteAnniversary = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      await this.anniversaryService.deleteAnniversary(id, userId);

      const response: ApiResponse = {
        success: true,
        message: "Anniversary deleted successfully",
        data: null,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get upcoming anniversaries
   */
  public getUpcomingAnniversaries = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;
      const { days } = req.query;

      const daysNumber = days ? parseInt(days as string) : 30;

      const anniversaries =
        await this.anniversaryService.getUpcomingAnniversaries(
          coupleId,
          userId,
          daysNumber
        );

      const response: ApiResponse = {
        success: true,
        message: "Upcoming anniversaries retrieved successfully",
        data: anniversaries.map((anniversary) => ({
          id: anniversary._id,
          coupleId: anniversary.coupleId,
          title: anniversary.title,
          date: anniversary.date,
          remindBefore: anniversary.remindBefore,
          repeatAnnually: anniversary.repeatAnnually,
          createdAt: anniversary.createdAt,
          updatedAt: anniversary.updatedAt,
        })),
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get anniversaries by date range
   */
  public getAnniversariesByDateRange = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw new AppError("Start date and end date are required", 400);
      }

      const anniversaries =
        await this.anniversaryService.getAnniversariesByDateRange(
          coupleId,
          userId,
          new Date(startDate as string),
          new Date(endDate as string)
        );

      const response: ApiResponse = {
        success: true,
        message: "Anniversaries by date range retrieved successfully",
        data: anniversaries.map((anniversary) => ({
          id: anniversary._id,
          coupleId: anniversary.coupleId,
          title: anniversary.title,
          date: anniversary.date,
          remindBefore: anniversary.remindBefore,
          repeatAnnually: anniversary.repeatAnnually,
          createdAt: anniversary.createdAt,
          updatedAt: anniversary.updatedAt,
        })),
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get anniversary statistics
   */
  public getAnniversaryStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;

      const stats = await this.anniversaryService.getAnniversaryStats(
        coupleId,
        userId
      );

      const response: ApiResponse = {
        success: true,
        message: "Anniversary statistics retrieved successfully",
        data: stats,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );
}
