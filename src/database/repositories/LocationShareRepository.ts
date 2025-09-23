import { Types } from "mongoose";
import { LocationShare, ILocationShare } from "../models/LocationShare";
import { AppError } from "../../utils/AppError";

export class LocationShareRepository {
  /**
   * Create a new location share
   */
  async create(locationData: {
    coupleId: string;
    userId: string;
    lat: number;
    lng: number;
    expiresAt: Date;
  }): Promise<ILocationShare> {
    try {
      const location = new LocationShare({
        coupleId: new Types.ObjectId(locationData.coupleId),
        userId: new Types.ObjectId(locationData.userId),
        lat: locationData.lat,
        lng: locationData.lng,
        expiresAt: locationData.expiresAt,
      });

      await location.save();
      return location.populate("userId", "name email");
    } catch (error) {
      throw new AppError("Failed to create location share", 500);
    }
  }

  /**
   * Find location by ID
   */
  async findById(locationId: string): Promise<ILocationShare | null> {
    try {
      if (!Types.ObjectId.isValid(locationId)) {
        return null;
      }
      return await LocationShare.findById(locationId).populate(
        "userId",
        "name email"
      );
    } catch (error) {
      throw new AppError("Failed to find location", 500);
    }
  }

  /**
   * Find locations by couple ID
   */
  async findByCoupleId(
    coupleId: string,
    options: {
      userId?: string;
      includeExpired?: boolean;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
      sortBy?: "newest" | "oldest";
    } = {}
  ): Promise<{
    locations: ILocationShare[];
    total: number;
  }> {
    try {
      let query: any = { coupleId: new Types.ObjectId(coupleId) };

      if (options.userId) {
        query.userId = new Types.ObjectId(options.userId);
      }

      if (!options.includeExpired) {
        query.expiresAt = { $gt: new Date() };
      }

      if (options.startDate || options.endDate) {
        query.sharedAt = {};
        if (options.startDate) {
          query.sharedAt.$gte = options.startDate;
        }
        if (options.endDate) {
          query.sharedAt.$lte = options.endDate;
        }
      }

      const total = await LocationShare.countDocuments(query);

      let locationsQuery = LocationShare.find(query).populate(
        "userId",
        "name email"
      );

      const sortOrder = options.sortBy === "oldest" ? 1 : -1;
      locationsQuery = locationsQuery.sort({ sharedAt: sortOrder });

      if (options.limit) {
        locationsQuery = locationsQuery.limit(options.limit);
      }

      if (options.offset) {
        locationsQuery = locationsQuery.skip(options.offset);
      }

      const locations = await locationsQuery.exec();

      return { locations, total };
    } catch (error) {
      throw new AppError("Failed to find locations by couple", 500);
    }
  }

  /**
   * Update location
   */
  async update(
    locationId: string,
    updateData: {
      lat?: number;
      lng?: number;
      expiresAt?: Date;
    }
  ): Promise<ILocationShare | null> {
    try {
      return await LocationShare.findByIdAndUpdate(
        locationId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate("userId", "name email");
    } catch (error) {
      throw new AppError("Failed to update location", 500);
    }
  }

  /**
   * Delete location
   */
  async delete(locationId: string): Promise<boolean> {
    try {
      const result = await LocationShare.findByIdAndDelete(locationId);
      return !!result;
    } catch (error) {
      throw new AppError("Failed to delete location", 500);
    }
  }

  /**
   * Get current active location for a user
   */
  async getCurrentLocation(
    coupleId: string,
    userId: string
  ): Promise<ILocationShare | null> {
    try {
      return await LocationShare.findOne({
        coupleId: new Types.ObjectId(coupleId),
        userId: new Types.ObjectId(userId),
        expiresAt: { $gt: new Date() },
      })
        .sort({ sharedAt: -1 })
        .populate("userId", "name email");
    } catch (error) {
      throw new AppError("Failed to get current location", 500);
    }
  }

  /**
   * Get all active locations for a couple
   */
  async getActiveLocations(coupleId: string): Promise<ILocationShare[]> {
    try {
      return await LocationShare.find({
        coupleId: new Types.ObjectId(coupleId),
        expiresAt: { $gt: new Date() },
      })
        .sort({ sharedAt: -1 })
        .populate("userId", "name email");
    } catch (error) {
      throw new AppError("Failed to get active locations", 500);
    }
  }

  /**
   * Share new location (automatically set expiration time)
   */
  async shareLocation(locationData: {
    coupleId: string;
    userId: string;
    lat: number;
    lng: number;
    durationInMinutes?: number; // Default 60 minutes
  }): Promise<ILocationShare> {
    try {
      const duration = locationData.durationInMinutes || 60;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + duration);

      return await this.create({
        coupleId: locationData.coupleId,
        userId: locationData.userId,
        lat: locationData.lat,
        lng: locationData.lng,
        expiresAt,
      });
    } catch (error) {
      throw new AppError("Failed to share location", 500);
    }
  }

  /**
   * Stop sharing location for a user
   */
  async stopSharing(coupleId: string, userId: string): Promise<boolean> {
    try {
      const result = await LocationShare.updateMany(
        {
          coupleId: new Types.ObjectId(coupleId),
          userId: new Types.ObjectId(userId),
          expiresAt: { $gt: new Date() },
        },
        { $set: { expiresAt: new Date() } }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      throw new AppError("Failed to stop sharing location", 500);
    }
  }

  /**
   * Get location history for a user
   */
  async getLocationHistory(
    coupleId: string,
    userId: string,
    options: {
      days?: number;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    locations: ILocationShare[];
    total: number;
  }> {
    try {
      let query: any = {
        coupleId: new Types.ObjectId(coupleId),
        userId: new Types.ObjectId(userId),
      };

      if (options.days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - options.days);
        query.sharedAt = { $gte: startDate };
      }

      const total = await LocationShare.countDocuments(query);

      let locationsQuery = LocationShare.find(query)
        .populate("userId", "name email")
        .sort({ sharedAt: -1 });

      if (options.limit) {
        locationsQuery = locationsQuery.limit(options.limit);
      }

      if (options.offset) {
        locationsQuery = locationsQuery.skip(options.offset);
      }

      const locations = await locationsQuery.exec();

      return { locations, total };
    } catch (error) {
      throw new AppError("Failed to get location history", 500);
    }
  }

  /**
   * Calculate distance between two locations
   */
  async getDistance(
    location1Id: string,
    location2Id: string
  ): Promise<number | null> {
    try {
      const [loc1, loc2] = await Promise.all([
        LocationShare.findById(location1Id),
        LocationShare.findById(location2Id),
      ]);

      if (!loc1 || !loc2) {
        return null;
      }

      // Haversine formula to calculate distance
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (loc1.lat * Math.PI) / 180;
      const φ2 = (loc2.lat * Math.PI) / 180;
      const Δφ = ((loc2.lat - loc1.lat) * Math.PI) / 180;
      const Δλ = ((loc2.lng - loc1.lng) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // Distance in meters
    } catch (error) {
      throw new AppError("Failed to calculate distance", 500);
    }
  }

  /**
   * Get location statistics
   */
  async getStatistics(
    coupleId: string,
    options: {
      userId?: string;
      days?: number;
    } = {}
  ): Promise<{
    total: number;
    active: number;
    thisWeek: number;
    averagePerDay: number;
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
        sharedAt: { $gte: startDate },
      };
      let weekMatchQuery: any = {
        coupleId: new Types.ObjectId(coupleId),
        sharedAt: { $gte: startOfWeek },
      };

      if (options.userId) {
        matchQuery.userId = new Types.ObjectId(options.userId);
        recentMatchQuery.userId = new Types.ObjectId(options.userId);
        weekMatchQuery.userId = new Types.ObjectId(options.userId);
      }

      const [total, active, thisWeek] = await Promise.all([
        LocationShare.countDocuments(recentMatchQuery),
        LocationShare.countDocuments({
          ...matchQuery,
          expiresAt: { $gt: new Date() },
        }),
        LocationShare.countDocuments(weekMatchQuery),
      ]);

      const averagePerDay = total / days;

      return {
        total,
        active,
        thisWeek,
        averagePerDay,
      };
    } catch (error) {
      throw new AppError("Failed to get location statistics", 500);
    }
  }

  /**
   * Check if location exists
   */
  async exists(locationId: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(locationId)) {
        return false;
      }
      const location = await LocationShare.findById(locationId).select("_id");
      return !!location;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get latest active location for each user in couple
   */
  async getLatestActiveLocationsForCouple(
    coupleId: string
  ): Promise<ILocationShare[]> {
    try {
      return await LocationShare.aggregate([
        {
          $match: {
            coupleId: new Types.ObjectId(coupleId),
            expiresAt: { $gt: new Date() },
          },
        },
        {
          $sort: { sharedAt: -1 },
        },
        {
          $group: {
            _id: "$userId",
            latestLocation: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: { newRoot: "$latestLocation" },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userId",
            pipeline: [{ $project: { name: 1, email: 1 } }],
          },
        },
        {
          $unwind: "$userId",
        },
      ]);
    } catch (error) {
      throw new AppError(
        "Failed to get latest active locations for couple",
        500
      );
    }
  }

  /**
   * Clean up expired locations
   */
  async cleanupExpiredLocations(): Promise<number> {
    try {
      const result = await LocationShare.deleteMany({
        expiresAt: { $lt: new Date() },
      });
      return result.deletedCount || 0;
    } catch (error) {
      throw new AppError("Failed to cleanup expired locations", 500);
    }
  }
}
