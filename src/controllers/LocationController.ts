import { Request, Response } from "express";
import { ApiResponse } from "../types/index";
import { AppError } from "../utils/AppError";
import { LocationShareService } from "../database/services/LocationShareService";
import { asyncHandler } from "../utils/asyncHandler";

export class LocationController {
  /**
   * Share current location
   */
  public shareLocation = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId, lat, lng, duration } = req.body;

      if (!coupleId || lat === undefined || lng === undefined) {
        throw new AppError(
          "Couple ID, latitude, and longitude are required",
          400
        );
      }

      const locationShare = await LocationShareService.shareLocation(
        coupleId,
        userId,
        { lat, lng, duration }
      );

      const response: ApiResponse = {
        success: true,
        message: "Location shared successfully",
        data: {
          id: locationShare._id,
          coupleId: locationShare.coupleId,
          user: locationShare.userId,
          lat: locationShare.lat,
          lng: locationShare.lng,
          sharedAt: locationShare.sharedAt,
          expiresAt: locationShare.expiresAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    }
  );

  /**
   * Get current shared locations for couple
   */
  public getCurrentSharedLocations = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;

      const locations = await LocationShareService.getCurrentSharedLocations(
        coupleId,
        userId
      );

      const response: ApiResponse = {
        success: true,
        message: "Current shared locations retrieved successfully",
        data: locations.map((location) => ({
          id: location._id,
          coupleId: location.coupleId,
          user: location.userId,
          lat: location.lat,
          lng: location.lng,
          sharedAt: location.sharedAt,
          expiresAt: location.expiresAt,
        })),
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get user's current location
   */
  public getUserCurrentLocation = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const requestUserId = req.user!._id.toString();
      const { coupleId, userId } = req.params;

      const location = await LocationShareService.getUserCurrentLocation(
        coupleId,
        userId,
        requestUserId
      );

      const response: ApiResponse = {
        success: true,
        message: "User current location retrieved successfully",
        data: location
          ? {
              id: location._id,
              coupleId: location.coupleId,
              user: location.userId,
              lat: location.lat,
              lng: location.lng,
              sharedAt: location.sharedAt,
              expiresAt: location.expiresAt,
            }
          : null,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update shared location
   */
  public updateLocation = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;
      const { lat, lng, extendDuration } = req.body;

      if (lat === undefined || lng === undefined) {
        throw new AppError("Latitude and longitude are required", 400);
      }

      const locationShare = await LocationShareService.updateLocation(
        coupleId,
        userId,
        { lat, lng, extendDuration }
      );

      const response: ApiResponse = {
        success: true,
        message: "Location updated successfully",
        data: {
          id: locationShare._id,
          coupleId: locationShare.coupleId,
          user: locationShare.userId,
          lat: locationShare.lat,
          lng: locationShare.lng,
          sharedAt: locationShare.sharedAt,
          expiresAt: locationShare.expiresAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Stop sharing location
   */
  public stopSharingLocation = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;

      await LocationShareService.stopSharingLocation(coupleId, userId);

      const response: ApiResponse = {
        success: true,
        message: "Location sharing stopped successfully",
        data: null,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Extend location sharing duration
   */
  public extendLocationSharing = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;
      const { additionalMinutes } = req.body;

      if (!additionalMinutes || additionalMinutes <= 0) {
        throw new AppError("Additional minutes must be a positive number", 400);
      }

      const locationShare = await LocationShareService.extendLocationSharing(
        coupleId,
        userId,
        additionalMinutes
      );

      const response: ApiResponse = {
        success: true,
        message: "Location sharing extended successfully",
        data: {
          id: locationShare._id,
          coupleId: locationShare.coupleId,
          user: locationShare.userId,
          lat: locationShare.lat,
          lng: locationShare.lng,
          sharedAt: locationShare.sharedAt,
          expiresAt: locationShare.expiresAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get location sharing history
   */
  public getLocationHistory = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;
      const { targetUserId, startDate, endDate, limit, offset } = req.query;

      const options = {
        targetUserId: targetUserId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const result = await LocationShareService.getLocationHistory(
        coupleId,
        userId,
        options
      );

      const response: ApiResponse = {
        success: true,
        message: "Location history retrieved successfully",
        data: {
          locations: result.locations.map((location) => ({
            id: location._id,
            coupleId: location.coupleId,
            user: location.userId,
            lat: location.lat,
            lng: location.lng,
            sharedAt: location.sharedAt,
            expiresAt: location.expiresAt,
          })),
          total: result.total,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Calculate distance between users
   */
  public calculateDistanceBetweenUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;

      const result = await LocationShareService.calculateDistanceBetweenUsers(
        coupleId,
        userId
      );

      const response: ApiResponse = {
        success: true,
        message: "Distance calculated successfully",
        data: {
          distance: result.distance,
          unit: result.unit,
          user1Location: result.user1Location
            ? {
                id: result.user1Location._id,
                user: result.user1Location.userId,
                lat: result.user1Location.lat,
                lng: result.user1Location.lng,
                sharedAt: result.user1Location.sharedAt,
                expiresAt: result.user1Location.expiresAt,
              }
            : null,
          user2Location: result.user2Location
            ? {
                id: result.user2Location._id,
                user: result.user2Location.userId,
                lat: result.user2Location.lat,
                lng: result.user2Location.lng,
                sharedAt: result.user2Location.sharedAt,
                expiresAt: result.user2Location.expiresAt,
              }
            : null,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get location sharing statistics
   */
  public getLocationStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;

      const stats = await LocationShareService.getLocationStats(
        coupleId,
        userId
      );

      const response: ApiResponse = {
        success: true,
        message: "Location statistics retrieved successfully",
        data: stats,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Clean up expired location shares (admin utility)
   */
  public cleanupExpiredShares = asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      const deletedCount = await LocationShareService.cleanupExpiredShares();

      const response: ApiResponse = {
        success: true,
        message: "Expired location shares cleaned up successfully",
        data: {
          deletedCount,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );
}
