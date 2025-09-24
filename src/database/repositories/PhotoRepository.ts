import { Types } from "mongoose";
import { Photo, IPhoto } from "../models/Photo";

export class PhotoRepository {
  /**
   * Create a new photo
   */
  async create(
    coupleId: string,
    uploaderId: string,
    photoData: {
      url: string;
      caption?: string;
      isFavorite?: boolean;
    }
  ): Promise<IPhoto> {
    const photo = new Photo({
      coupleId: new Types.ObjectId(coupleId),
      uploaderId: new Types.ObjectId(uploaderId),
      ...photoData,
    });
    return await photo.save();
  }

  /**
   * Find photo by ID
   */
  async findById(photoId: string): Promise<IPhoto | null> {
    if (!Types.ObjectId.isValid(photoId)) {
      return null;
    }
    return await Photo.findById(photoId);
  }

  /**
   * Find photos by filters
   */
  async findByFilters(
    filters: any,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ): Promise<IPhoto[]> {
    let query = Photo.find(filters);

    // Apply sorting
    if (options.sortBy) {
      const sortDirection = options.sortOrder === "asc" ? 1 : -1;
      query = query.sort({ [options.sortBy]: sortDirection });
    }

    // Apply pagination
    if (options.offset) {
      query = query.skip(options.offset);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    return await query.exec();
  }

  /**
   * Count photos by filters
   */
  async countByFilters(filters: any): Promise<number> {
    return await Photo.countDocuments(filters);
  }

  /**
   * Update photo by ID
   */
  async update(
    photoId: string,
    updateData: Partial<IPhoto>
  ): Promise<IPhoto | null> {
    if (!Types.ObjectId.isValid(photoId)) {
      return null;
    }
    return await Photo.findByIdAndUpdate(photoId, updateData, {
      new: true,
      runValidators: true,
    });
  }

  /**
   * Delete photo by ID
   */
  async delete(photoId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(photoId)) {
      return false;
    }
    const result = await Photo.findByIdAndDelete(photoId);
    return !!result;
  }

  /**
   * Check if photo exists
   */
  async exists(photoId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(photoId)) {
      return false;
    }
    const photo = await Photo.findById(photoId).select("_id");
    return !!photo;
  }
}
