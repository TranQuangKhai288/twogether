import { Types } from "mongoose";
import { Photo, IPhoto } from "../models/Photo";
import { Couple } from "../models/Couple";
import { AppError } from "../../utils/AppError";

export class PhotoRepository {
  /**
   * Upload a new photo
   */
  public static async uploadPhoto(
    coupleId: string,
    uploaderId: string,
    photoData: {
      url: string;
      caption?: string;
      isFavorite?: boolean;
    }
  ): Promise<IPhoto> {
    // Verify couple exists and user belongs to it
    const couple = await Couple.findById(coupleId);
    if (!couple) {
      throw new AppError("Couple not found", 404);
    }

    const userInCouple = couple.users.some(
      (user) => user.toString() === uploaderId
    );
    if (!userInCouple) {
      throw new AppError("You are not a member of this couple", 403);
    }

    // Create photo
    const photo = new Photo({
      coupleId: new Types.ObjectId(coupleId),
      uploaderId: new Types.ObjectId(uploaderId),
      url: photoData.url,
      caption: photoData.caption,
      isFavorite: photoData.isFavorite ?? false,
    });

    await photo.save();
    return photo;
  }

  /**
   * Get all photos for a couple
   */
  public static async getCouplePhotos(
    coupleId: string,
    userId: string,
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
    favoritesCount: number;
  }> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

    let query: any = { coupleId: new Types.ObjectId(coupleId) };

    // Filter by favorites only
    if (options.favoritesOnly) {
      query.isFavorite = true;
    }

    // Filter by uploader
    if (options.uploaderId) {
      query.uploaderId = new Types.ObjectId(options.uploaderId);
    }

    const total = await Photo.countDocuments(query);
    const favoritesCount = await Photo.countDocuments({
      coupleId: new Types.ObjectId(coupleId),
      isFavorite: true,
    });

    let photosQuery = Photo.find(query).populate("uploaderId", "name email");

    // Sorting
    const sortOrder = options.sortBy === "oldest" ? 1 : -1;
    photosQuery = photosQuery.sort({ createdAt: sortOrder });

    if (options.limit) {
      photosQuery = photosQuery.limit(options.limit);
    }

    if (options.offset) {
      photosQuery = photosQuery.skip(options.offset);
    }

    const photos = await photosQuery.exec();

    return { photos, total, favoritesCount };
  }

  /**
   * Get photo by ID
   */
  public static async getPhotoById(
    photoId: string,
    userId: string
  ): Promise<IPhoto> {
    const photo = await Photo.findById(photoId).populate(
      "uploaderId",
      "name email"
    );
    if (!photo) {
      throw new AppError("Photo not found", 404);
    }

    // Verify user belongs to couple
    await this.verifyCoupleAccess(photo.coupleId.toString(), userId);

    return photo;
  }

  /**
   * Update photo
   */
  public static async updatePhoto(
    photoId: string,
    userId: string,
    updateData: {
      caption?: string;
      isFavorite?: boolean;
    }
  ): Promise<IPhoto> {
    const photo = await Photo.findById(photoId);
    if (!photo) {
      throw new AppError("Photo not found", 404);
    }

    // Verify user belongs to couple
    await this.verifyCoupleAccess(photo.coupleId.toString(), userId);

    // Update fields
    if (updateData.caption !== undefined) photo.caption = updateData.caption;
    if (updateData.isFavorite !== undefined)
      photo.isFavorite = updateData.isFavorite;

    await photo.save();
    return photo.populate("uploaderId", "name email");
  }

  /**
   * Delete photo
   */
  public static async deletePhoto(
    photoId: string,
    userId: string
  ): Promise<void> {
    const photo = await Photo.findById(photoId);
    if (!photo) {
      throw new AppError("Photo not found", 404);
    }

    // Verify user belongs to couple
    await this.verifyCoupleAccess(photo.coupleId.toString(), userId);

    // Only the uploader can delete their own photo
    if (photo.uploaderId.toString() !== userId) {
      throw new AppError("You can only delete your own photos", 403);
    }

    await Photo.findByIdAndDelete(photoId);
  }

  /**
   * Toggle favorite status
   */
  public static async toggleFavorite(
    photoId: string,
    userId: string
  ): Promise<IPhoto> {
    const photo = await Photo.findById(photoId);
    if (!photo) {
      throw new AppError("Photo not found", 404);
    }

    // Verify user belongs to couple
    await this.verifyCoupleAccess(photo.coupleId.toString(), userId);

    photo.isFavorite = !photo.isFavorite;
    await photo.save();

    return photo.populate("uploaderId", "name email");
  }

  /**
   * Get favorite photos
   */
  public static async getFavoritePhotos(
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
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

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
  }

  /**
   * Get photos by uploader
   */
  public static async getPhotosByUploader(
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
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

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
  }

  /**
   * Get photo statistics
   */
  public static async getPhotoStats(
    coupleId: string,
    userId: string
  ): Promise<{
    total: number;
    favorites: number;
    byUploader: { [uploaderId: string]: number };
    thisMonth: number;
  }> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

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
  }

  /**
   * Search photos by caption
   */
  public static async searchPhotos(
    coupleId: string,
    userId: string,
    searchTerm: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    photos: IPhoto[];
    total: number;
  }> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

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
