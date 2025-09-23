import { Types } from "mongoose";
import { Photo, IPhoto } from "../models/Photo";
import { AppError } from "../../utils/AppError";

export class PhotoRepository {
  /**
   * Create a new photo
   */
  async create(photoData: {
    coupleId: string;
    uploaderId: string;
    url: string;
    caption?: string;
    isFavorite?: boolean;
  }): Promise<IPhoto> {
    try {
      const photo = new Photo({
        coupleId: new Types.ObjectId(photoData.coupleId),
        uploaderId: new Types.ObjectId(photoData.uploaderId),
        url: photoData.url,
        caption: photoData.caption,
        isFavorite: photoData.isFavorite ?? false,
      });

      await photo.save();
      return photo.populate("uploaderId", "name email");
    } catch (error) {
      throw new AppError("Failed to create photo", 500);
    }
  }

  /**
   * Find photo by ID
   */
  async findById(photoId: string): Promise<IPhoto | null> {
    try {
      if (!Types.ObjectId.isValid(photoId)) {
        return null;
      }
      return await Photo.findById(photoId).populate("uploaderId", "name email");
    } catch (error) {
      throw new AppError("Failed to find photo", 500);
    }
  }

  /**
   * Find photos by couple ID
   */
  async findByCoupleId(
    coupleId: string,
    options: {
      favoritesOnly?: boolean;
      uploaderId?: string;
      limit?: number;
      offset?: number;
      sortBy?: "newest" | "oldest";
    } = {}
  ): Promise<{
    photos: IPhoto[];
    total: number;
  }> {
    try {
      let query: any = { coupleId: new Types.ObjectId(coupleId) };

      if (options.favoritesOnly) {
        query.isFavorite = true;
      }

      if (options.uploaderId) {
        query.uploaderId = new Types.ObjectId(options.uploaderId);
      }

      const total = await Photo.countDocuments(query);

      let photosQuery = Photo.find(query).populate("uploaderId", "name email");

      const sortOrder = options.sortBy === "oldest" ? 1 : -1;
      photosQuery = photosQuery.sort({ createdAt: sortOrder });

      if (options.limit) {
        photosQuery = photosQuery.limit(options.limit);
      }

      if (options.offset) {
        photosQuery = photosQuery.skip(options.offset);
      }

      const photos = await photosQuery.exec();

      return { photos, total };
    } catch (error) {
      throw new AppError("Failed to find photos by couple", 500);
    }
  }

  /**
   * Update photo
   */
  async update(
    photoId: string,
    updateData: {
      caption?: string;
      isFavorite?: boolean;
    }
  ): Promise<IPhoto | null> {
    try {
      return await Photo.findByIdAndUpdate(
        photoId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate("uploaderId", "name email");
    } catch (error) {
      throw new AppError("Failed to update photo", 500);
    }
  }

  /**
   * Delete photo
   */
  async delete(photoId: string): Promise<boolean> {
    try {
      const result = await Photo.findByIdAndDelete(photoId);
      return !!result;
    } catch (error) {
      throw new AppError("Failed to delete photo", 500);
    }
  }

  /**
   * Get favorite photos
   */
  async getFavorites(
    coupleId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    photos: IPhoto[];
    total: number;
  }> {
    try {
      const query = {
        coupleId: new Types.ObjectId(coupleId),
        isFavorite: true,
      };

      const total = await Photo.countDocuments(query);

      let photosQuery = Photo.find(query)
        .populate("uploaderId", "name email")
        .sort({ createdAt: -1 });

      if (options.limit) {
        photosQuery = photosQuery.limit(options.limit);
      }

      if (options.offset) {
        photosQuery = photosQuery.skip(options.offset);
      }

      const photos = await photosQuery.exec();

      return { photos, total };
    } catch (error) {
      throw new AppError("Failed to get favorite photos", 500);
    }
  }

  /**
   * Get photos by uploader
   */
  async findByUploader(
    coupleId: string,
    uploaderId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    photos: IPhoto[];
    total: number;
  }> {
    try {
      const query = {
        coupleId: new Types.ObjectId(coupleId),
        uploaderId: new Types.ObjectId(uploaderId),
      };

      const total = await Photo.countDocuments(query);

      let photosQuery = Photo.find(query)
        .populate("uploaderId", "name email")
        .sort({ createdAt: -1 });

      if (options.limit) {
        photosQuery = photosQuery.limit(options.limit);
      }

      if (options.offset) {
        photosQuery = photosQuery.skip(options.offset);
      }

      const photos = await photosQuery.exec();

      return { photos, total };
    } catch (error) {
      throw new AppError("Failed to find photos by uploader", 500);
    }
  }

  /**
   * Search photos by caption
   */
  async searchByCaption(
    coupleId: string,
    searchTerm: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    photos: IPhoto[];
    total: number;
  }> {
    try {
      const query = {
        coupleId: new Types.ObjectId(coupleId),
        caption: { $regex: searchTerm, $options: "i" },
      };

      const total = await Photo.countDocuments(query);

      let photosQuery = Photo.find(query)
        .populate("uploaderId", "name email")
        .sort({ createdAt: -1 });

      if (options.limit) {
        photosQuery = photosQuery.limit(options.limit);
      }

      if (options.offset) {
        photosQuery = photosQuery.skip(options.offset);
      }

      const photos = await photosQuery.exec();

      return { photos, total };
    } catch (error) {
      throw new AppError("Failed to search photos", 500);
    }
  }

  /**
   * Get photo statistics
   */
  async getStatistics(coupleId: string): Promise<{
    total: number;
    favorites: number;
    byUploader: { [uploaderId: string]: number };
    thisMonth: number;
  }> {
    try {
      const coupleObjectId = new Types.ObjectId(coupleId);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [total, favorites, thisMonth, uploaderStats] = await Promise.all([
        Photo.countDocuments({ coupleId: coupleObjectId }),
        Photo.countDocuments({ coupleId: coupleObjectId, isFavorite: true }),
        Photo.countDocuments({
          coupleId: coupleObjectId,
          createdAt: { $gte: startOfMonth },
        }),
        Photo.aggregate([
          { $match: { coupleId: coupleObjectId } },
          { $group: { _id: "$uploaderId", count: { $sum: 1 } } },
        ]),
      ]);

      const byUploader: { [uploaderId: string]: number } = {};
      uploaderStats.forEach((stat: any) => {
        byUploader[stat._id.toString()] = stat.count;
      });

      return { total, favorites, byUploader, thisMonth };
    } catch (error) {
      throw new AppError("Failed to get photo statistics", 500);
    }
  }

  /**
   * Get favorites count for couple
   */
  async getFavoritesCount(coupleId: string): Promise<number> {
    try {
      return await Photo.countDocuments({
        coupleId: new Types.ObjectId(coupleId),
        isFavorite: true,
      });
    } catch (error) {
      throw new AppError("Failed to get favorites count", 500);
    }
  }

  /**
   * Check if photo exists
   */
  async exists(photoId: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(photoId)) {
        return false;
      }
      const photo = await Photo.findById(photoId).select("_id");
      return !!photo;
    } catch (error) {
      return false;
    }
  }
}
