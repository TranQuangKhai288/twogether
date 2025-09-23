import { Request, Response } from "express";
import { ApiResponse, PaginatedResponse } from "../types/index.js";
import { AppError } from "../utils/AppError.js";
import { CoupleService } from "../database/services/CoupleService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export class CoupleController {
  private coupleService: CoupleService;

  constructor() {
    this.coupleService = new CoupleService();
  }

  /**
   * Join couple by invite code
   */
  public joinCouple = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;
      const { inviteCode } = req.body;

      if (!inviteCode) {
        throw new AppError("Invite code is required", 400);
      }

      const couple = await this.coupleService.joinCoupleByInviteCode(
        userId.toString(),
        inviteCode
      );

      const response: ApiResponse = {
        success: true,
        message: "Successfully joined couple",
        data: {
          id: couple._id,
          users: couple.users,
          anniversaryDate: couple.anniversaryDate,
          inviteCode: couple.inviteCode,
          settings: couple.settings,
          createdAt: couple.createdAt,
          updatedAt: couple.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get current user's couple
   */
  public getMyCouple = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;

      const couple = await this.coupleService.getCoupleByUserId(
        userId.toString()
      );

      if (!couple) {
        throw new AppError("You are not in a couple", 404);
      }

      const response: ApiResponse = {
        success: true,
        message: "Couple retrieved successfully",
        data: {
          id: couple._id,
          users: couple.users,
          anniversaryDate: couple.anniversaryDate,
          inviteCode: couple.inviteCode,
          settings: couple.settings,
          createdAt: couple.createdAt,
          updatedAt: couple.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get couple by ID
   */
  public getCoupleById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = req.user!._id;

      const couple = await this.coupleService.getCoupleById(id);

      if (!couple) {
        throw new AppError("Couple not found", 404);
      }

      // Check if user is part of this couple
      const isUserInCouple = couple.users.some(
        (user) => user._id.toString() === userId.toString()
      );

      if (!isUserInCouple) {
        throw new AppError("You are not authorized to view this couple", 403);
      }

      const response: ApiResponse = {
        success: true,
        message: "Couple retrieved successfully",
        data: {
          id: couple._id,
          users: couple.users,
          anniversaryDate: couple.anniversaryDate,
          inviteCode: couple.inviteCode,
          settings: couple.settings,
          createdAt: couple.createdAt,
          updatedAt: couple.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update couple settings
   */
  public updateSettings = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;
      const { settings } = req.body;

      if (!settings || typeof settings !== "object") {
        throw new AppError("Settings object is required", 400);
      }

      // Get user's couple first
      const couple = await this.coupleService.getCoupleByUserId(
        userId.toString()
      );
      if (!couple) {
        throw new AppError("You are not in a couple", 404);
      }

      const updatedCouple = await this.coupleService.updateCoupleSettings(
        couple._id.toString(),
        settings
      );

      const response: ApiResponse = {
        success: true,
        message: "Couple settings updated successfully",
        data: {
          id: updatedCouple!._id,
          settings: updatedCouple!.settings,
          updatedAt: updatedCouple!.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update anniversary date
   */
  public updateAnniversaryDate = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;
      const { anniversaryDate } = req.body;

      if (!anniversaryDate) {
        throw new AppError("Anniversary date is required", 400);
      }

      // Get user's couple first
      const couple = await this.coupleService.getCoupleByUserId(
        userId.toString()
      );
      if (!couple) {
        throw new AppError("You are not in a couple", 404);
      }

      const updatedCouple = await this.coupleService.updateAnniversaryDate(
        couple._id.toString(),
        new Date(anniversaryDate)
      );

      const response: ApiResponse = {
        success: true,
        message: "Anniversary date updated successfully",
        data: {
          id: updatedCouple!._id,
          anniversaryDate: updatedCouple!.anniversaryDate,
          updatedAt: updatedCouple!.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Regenerate invite code
   */
  public regenerateInviteCode = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;

      // Get user's couple first
      const couple = await this.coupleService.getCoupleByUserId(
        userId.toString()
      );
      if (!couple) {
        throw new AppError("You are not in a couple", 404);
      }

      const newInviteCode = await this.coupleService.generateNewInviteCode(
        couple._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: "Invite code regenerated successfully",
        data: {
          inviteCode: newInviteCode,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Leave couple
   */
  public leaveCouple = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;

      // Get user's couple first to verify they are in one
      const couple = await this.coupleService.getCoupleByUserId(
        userId.toString()
      );
      if (!couple) {
        throw new AppError("You are not in a couple", 404);
      }

      await this.coupleService.removeUserFromCouple(
        couple._id.toString(),
        userId.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: "Successfully left couple",
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get partner information
   */
  public getPartner = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;

      // Get user's couple first
      const couple = await this.coupleService.getCoupleByUserId(
        userId.toString()
      );
      if (!couple) {
        throw new AppError("You are not in a couple", 404);
      }

      const partner = await this.coupleService.getPartner(
        couple._id.toString(),
        userId.toString()
      );

      if (!partner) {
        throw new AppError("Partner not found", 404);
      }

      const response: ApiResponse = {
        success: true,
        message: "Partner information retrieved successfully",
        data: {
          id: partner._id,
          email: partner.email,
          name: partner.name,
          gender: partner.gender,
          birthday: partner.birthday,
          avatarUrl: partner.avatarUrl,
          preferences: partner.preferences,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get couple statistics
   */
  public getCoupleStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;

      // Get user's couple first
      const couple = await this.coupleService.getCoupleByUserId(
        userId.toString()
      );
      if (!couple) {
        throw new AppError("You are not in a couple", 404);
      }

      // Calculate relationship days
      const relationshipDays = Math.floor(
        (new Date().getTime() - couple.anniversaryDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // TODO: Implement counts when Anniversary, Note, Photo models are ready
      const stats = {
        relationshipDays,
        anniversaryDate: couple.anniversaryDate,
        anniversariesCount: 0,
        notesCount: 0,
        photosCount: 0,
        lastActivity: couple.updatedAt,
      };

      const response: ApiResponse = {
        success: true,
        message: "Couple statistics retrieved successfully",
        data: stats,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get all couples (Admin only)
   */
  public getAllCouples = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.coupleService.getCouples(page, limit);

      const response: PaginatedResponse<any> = {
        success: true,
        message: "Couples retrieved successfully",
        data: result.couples.map((couple) => ({
          id: couple._id,
          users: couple.users,
          anniversaryDate: couple.anniversaryDate,
          inviteCode: couple.inviteCode,
          settings: couple.settings,
          createdAt: couple.createdAt,
          updatedAt: couple.updatedAt,
        })),
        pagination: {
          page: result.currentPage,
          limit,
          total: result.total,
          totalPages: result.totalPages,
          hasNext: result.currentPage < result.totalPages,
          hasPrev: result.currentPage > 1,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Delete couple (Admin only or couple members)
   */
  public deleteCouple = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = req.user!._id;

      // Check if couple exists and user has permission
      const couple = await this.coupleService.getCoupleById(id);
      if (!couple) {
        throw new AppError("Couple not found", 404);
      }

      // Check if user is part of this couple
      const isUserInCouple = couple.users.some(
        (user) => user._id.toString() === userId.toString()
      );

      if (!isUserInCouple) {
        throw new AppError("You are not authorized to delete this couple", 403);
      }

      await this.coupleService.deleteCouple(id);

      const response: ApiResponse = {
        success: true,
        message: "Couple deleted successfully",
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );
}
