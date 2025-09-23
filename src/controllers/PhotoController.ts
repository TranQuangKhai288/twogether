import { Request, Response } from "express";
import { ApiResponse } from "../types/index";
import { AppError } from "../utils/AppError";
import { PhotoService } from "../database/services/PhotoService";
import { asyncHandler } from "../utils/asyncHandler";

export class PhotoController {
  /**
   * Upload a new photo
   */
  public uploadPhoto = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const uploaderId = req.user!._id.toString();
      const { coupleId, url, caption, isFavorite } = req.body;

      if (!coupleId || !url) {
        throw new AppError("Couple ID and photo URL are required", 400);
      }

      const photo = await PhotoService.uploadPhoto(coupleId, uploaderId, {
        url,
        caption,
        isFavorite,
      });

      const response: ApiResponse = {
        success: true,
        message: "Photo uploaded successfully",
        data: {
          id: photo._id,
          coupleId: photo.coupleId,
          uploaderId: photo.uploaderId,
          url: photo.url,
          caption: photo.caption,
          isFavorite: photo.isFavorite,
          createdAt: photo.createdAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    }
  );

  /**
   * Get photos for couple
   */
  public getCouplePhotos = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;
      const { favoritesOnly, uploaderId, limit, offset, sortBy } = req.query;

      const options = {
        favoritesOnly: favoritesOnly === "true",
        uploaderId: uploaderId as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        sortBy: (sortBy as "newest" | "oldest") || "newest",
      };

      const result = await PhotoService.getCouplePhotos(
        coupleId,
        userId,
        options
      );

      const response: ApiResponse = {
        success: true,
        message: "Photos retrieved successfully",
        data: {
          photos: result.photos.map((photo) => ({
            id: photo._id,
            coupleId: photo.coupleId,
            uploader: photo.uploaderId,
            url: photo.url,
            caption: photo.caption,
            isFavorite: photo.isFavorite,
            createdAt: photo.createdAt,
          })),
          total: result.total,
          favoritesCount: result.favoritesCount,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get photo by ID
   */
  public getPhotoById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const photo = await PhotoService.getPhotoById(id, userId);

      const response: ApiResponse = {
        success: true,
        message: "Photo retrieved successfully",
        data: {
          id: photo._id,
          coupleId: photo.coupleId,
          uploader: photo.uploaderId,
          url: photo.url,
          caption: photo.caption,
          isFavorite: photo.isFavorite,
          createdAt: photo.createdAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Update photo
   */
  public updatePhoto = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { id } = req.params;
      const { caption, isFavorite } = req.body;

      const updateData: any = {};
      if (caption !== undefined) updateData.caption = caption;
      if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

      const photo = await PhotoService.updatePhoto(id, userId, updateData);

      const response: ApiResponse = {
        success: true,
        message: "Photo updated successfully",
        data: {
          id: photo._id,
          coupleId: photo.coupleId,
          uploader: photo.uploaderId,
          url: photo.url,
          caption: photo.caption,
          isFavorite: photo.isFavorite,
          createdAt: photo.createdAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Delete photo
   */
  public deletePhoto = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      await PhotoService.deletePhoto(id, userId);

      const response: ApiResponse = {
        success: true,
        message: "Photo deleted successfully",
        data: null,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Toggle favorite status
   */
  public toggleFavorite = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { id } = req.params;

      const photo = await PhotoService.toggleFavorite(id, userId);

      const response: ApiResponse = {
        success: true,
        message: `Photo ${photo.isFavorite ? "added to" : "removed from"} favorites`,
        data: {
          id: photo._id,
          coupleId: photo.coupleId,
          uploader: photo.uploaderId,
          url: photo.url,
          caption: photo.caption,
          isFavorite: photo.isFavorite,
          createdAt: photo.createdAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get favorite photos
   */
  public getFavoritePhotos = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;
      const { limit, offset } = req.query;

      const options = {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const result = await PhotoService.getFavoritePhotos(
        coupleId,
        userId,
        options
      );

      const response: ApiResponse = {
        success: true,
        message: "Favorite photos retrieved successfully",
        data: {
          photos: result.photos.map((photo) => ({
            id: photo._id,
            coupleId: photo.coupleId,
            uploader: photo.uploaderId,
            url: photo.url,
            caption: photo.caption,
            isFavorite: photo.isFavorite,
            createdAt: photo.createdAt,
          })),
          total: result.total,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get photos by uploader
   */
  public getPhotosByUploader = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId, uploaderId } = req.params;
      const { limit, offset } = req.query;

      const options = {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const result = await PhotoService.getPhotosByUploader(
        coupleId,
        uploaderId,
        userId,
        options
      );

      const response: ApiResponse = {
        success: true,
        message: "Photos by uploader retrieved successfully",
        data: {
          photos: result.photos.map((photo) => ({
            id: photo._id,
            coupleId: photo.coupleId,
            uploader: photo.uploaderId,
            url: photo.url,
            caption: photo.caption,
            isFavorite: photo.isFavorite,
            createdAt: photo.createdAt,
          })),
          total: result.total,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get photo statistics
   */
  public getPhotoStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;

      const stats = await PhotoService.getPhotoStats(coupleId, userId);

      const response: ApiResponse = {
        success: true,
        message: "Photo statistics retrieved successfully",
        data: stats,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Search photos by caption
   */
  public searchPhotos = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { coupleId } = req.params;
      const { q: searchTerm, limit, offset } = req.query;

      if (!searchTerm) {
        throw new AppError("Search term is required", 400);
      }

      const options = {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const result = await PhotoService.searchPhotos(
        coupleId,
        userId,
        searchTerm as string,
        options
      );

      const response: ApiResponse = {
        success: true,
        message: "Photo search completed successfully",
        data: {
          photos: result.photos.map((photo) => ({
            id: photo._id,
            coupleId: photo.coupleId,
            uploader: photo.uploaderId,
            url: photo.url,
            caption: photo.caption,
            isFavorite: photo.isFavorite,
            createdAt: photo.createdAt,
          })),
          total: result.total,
          searchTerm,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );
}
