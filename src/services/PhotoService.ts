import { Types } from "mongoose";
import { IPhoto } from "../database/models/Photo";
import { PhotoRepository } from "../database/repositories/PhotoRepository";
import { CoupleRepository } from "../database/repositories/CoupleRepository";
import { IPhotoService } from "./interfaces";
import { AppError } from "../utils/AppError";

export class PhotoService implements IPhotoService {
  private photoRepository: PhotoRepository;
  private coupleRepository: CoupleRepository;

  constructor() {
    this.photoRepository = new PhotoRepository();
    this.coupleRepository = new CoupleRepository();
  }

  /**
   * Upload a new photo with business logic validation
   */
  async uploadPhoto(
    coupleId: string,
    uploaderId: string,
    photoData: {
      url: string;
      caption?: string;
      isFavorite?: boolean;
    }
  ): Promise<IPhoto> {
    // Business validation
    if (!coupleId || !uploaderId || !photoData.url) {
      throw new AppError(
        "Couple ID, uploader ID, and photo URL are required",
        400
      );
    }

    if (
      !Types.ObjectId.isValid(coupleId) ||
      !Types.ObjectId.isValid(uploaderId)
    ) {
      throw new AppError("Invalid ID format", 400);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      uploaderId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Business logic: Set defaults
    const photoDataWithDefaults = {
      url: photoData.url,
      caption: photoData.caption || "",
      isFavorite: photoData.isFavorite ?? false,
    };

    return await this.photoRepository.create(
      coupleId,
      uploaderId,
      photoDataWithDefaults
    );
  }

  /**
   * Get couple photos with business logic
   */
  async getCouplePhotos(
    coupleId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: "createdAt" | "isFavorite";
      sortOrder?: "asc" | "desc";
    } = {}
  ): Promise<{
    photos: IPhoto[];
    total: number;
  }> {
    // Business validation
    if (!coupleId || !userId) {
      throw new AppError("Couple ID and user ID are required", 400);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    const filters = { coupleId: new Types.ObjectId(coupleId) };

    const [photos, total] = await Promise.all([
      this.photoRepository.findByFilters(filters, {
        limit: options.limit,
        offset: options.offset,
        sortBy: options.sortBy || "createdAt",
        sortOrder: options.sortOrder || "desc",
      }),
      this.photoRepository.countByFilters(filters),
    ]);

    return { photos, total };
  }

  /**
   * Get photo by ID with business logic
   */
  async getPhotoById(photoId: string, userId: string): Promise<IPhoto> {
    // Business validation
    if (!photoId || !userId) {
      throw new AppError("Photo ID and user ID are required", 400);
    }

    if (!Types.ObjectId.isValid(photoId) || !Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid ID format", 400);
    }

    const photo = await this.photoRepository.findById(photoId);
    if (!photo) {
      throw new AppError("Photo not found", 404);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      photo.coupleId.toString(),
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    return photo;
  }

  /**
   * Update photo with business logic
   */
  async updatePhoto(
    photoId: string,
    userId: string,
    updateData: {
      caption?: string;
      isFavorite?: boolean;
    }
  ): Promise<IPhoto> {
    // Business validation
    if (!photoId || !userId) {
      throw new AppError("Photo ID and user ID are required", 400);
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      throw new AppError("Update data is required", 400);
    }

    const photo = await this.photoRepository.findById(photoId);
    if (!photo) {
      throw new AppError("Photo not found", 404);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      photo.coupleId.toString(),
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    const updatedPhoto = await this.photoRepository.update(photoId, updateData);
    if (!updatedPhoto) {
      throw new AppError("Failed to update photo", 500);
    }

    return updatedPhoto;
  }

  /**
   * Delete photo with business logic
   */
  async deletePhoto(photoId: string, userId: string): Promise<boolean> {
    // Business validation
    if (!photoId || !userId) {
      throw new AppError("Photo ID and user ID are required", 400);
    }

    const photo = await this.photoRepository.findById(photoId);
    if (!photo) {
      throw new AppError("Photo not found", 404);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      photo.coupleId.toString(),
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    return await this.photoRepository.delete(photoId);
  }

  /**
   * Toggle photo favorite status with business logic
   */
  async togglePhotoFavorite(photoId: string, userId: string): Promise<IPhoto> {
    // Business validation
    if (!photoId || !userId) {
      throw new AppError("Photo ID and user ID are required", 400);
    }

    const photo = await this.photoRepository.findById(photoId);
    if (!photo) {
      throw new AppError("Photo not found", 404);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      photo.coupleId.toString(),
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Business logic: Toggle favorite status
    const updatedPhoto = await this.photoRepository.update(photoId, {
      isFavorite: !photo.isFavorite,
    });

    if (!updatedPhoto) {
      throw new AppError("Failed to toggle photo favorite", 500);
    }

    return updatedPhoto;
  }

  /**
   * Get favorite photos with business logic
   */
  async getFavoritePhotos(
    coupleId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    photos: IPhoto[];
    total: number;
  }> {
    // Business validation
    if (!coupleId || !userId) {
      throw new AppError("Couple ID and user ID are required", 400);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    const filters = {
      coupleId: new Types.ObjectId(coupleId),
      isFavorite: true,
    };

    const [photos, total] = await Promise.all([
      this.photoRepository.findByFilters(filters, {
        limit: options.limit,
        offset: options.offset,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
      this.photoRepository.countByFilters(filters),
    ]);

    return { photos, total };
  }

  /**
   * Get photos by uploader with business logic
   */
  async getPhotosByUploader(
    coupleId: string,
    uploaderId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    photos: IPhoto[];
    total: number;
  }> {
    // Business validation
    if (!coupleId || !uploaderId || !userId) {
      throw new AppError(
        "Couple ID, uploader ID, and user ID are required",
        400
      );
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    const filters = {
      coupleId: new Types.ObjectId(coupleId),
      uploaderId: new Types.ObjectId(uploaderId),
    };

    const [photos, total] = await Promise.all([
      this.photoRepository.findByFilters(filters, {
        limit: options.limit,
        offset: options.offset,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
      this.photoRepository.countByFilters(filters),
    ]);

    return { photos, total };
  }

  /**
   * Get photo statistics with business logic
   */
  async getPhotoStats(coupleId: string, userId: string): Promise<any> {
    // Business validation
    if (!coupleId || !userId) {
      throw new AppError("Couple ID and user ID are required", 400);
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Business logic: Calculate various statistics
    const coupleObjectId = new Types.ObjectId(coupleId);

    const [totalCount, favoriteCount] = await Promise.all([
      this.photoRepository.countByFilters({ coupleId: coupleObjectId }),
      this.photoRepository.countByFilters({
        coupleId: coupleObjectId,
        isFavorite: true,
      }),
    ]);

    return {
      total: totalCount,
      favorites: favoriteCount,
      regular: totalCount - favoriteCount,
    };
  }

  /**
   * Search photos with business logic
   */
  async searchPhotos(
    coupleId: string,
    userId: string,
    searchQuery: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    photos: IPhoto[];
    total: number;
  }> {
    // Business validation
    if (!coupleId || !userId || !searchQuery) {
      throw new AppError(
        "Couple ID, user ID, and search query are required",
        400
      );
    }

    // Verify user belongs to couple (business logic)
    const isUserInCouple = await this.coupleRepository.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    const filters = {
      coupleId: new Types.ObjectId(coupleId),
      $or: [
        { caption: { $regex: searchQuery, $options: "i" } },
        { url: { $regex: searchQuery, $options: "i" } },
      ],
    };

    const [photos, total] = await Promise.all([
      this.photoRepository.findByFilters(filters, {
        limit: options.limit,
        offset: options.offset,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
      this.photoRepository.countByFilters(filters),
    ]);

    return { photos, total };
  }
}
