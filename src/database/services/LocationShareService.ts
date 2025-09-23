import { Types } from "mongoose";
import { LocationShare, ILocationShare } from "../models/LocationShare";
import { Couple } from "../models/Couple";
import { AppError } from "../../utils/AppError";

export class LocationShareService {
  /**
   * Share current location
   */
  public static async shareLocation(
    coupleId: string,
    userId: string,
    locationData: {
      lat: number;
      lng: number;
      duration?: number; // Duration in minutes, default 60
    }
  ): Promise<ILocationShare> {
    // Verify couple exists and user belongs to it
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

    // Validate coordinates
    if (locationData.lat < -90 || locationData.lat > 90) {
      throw new AppError("Invalid latitude. Must be between -90 and 90", 400);
    }
    if (locationData.lng < -180 || locationData.lng > 180) {
      throw new AppError(
        "Invalid longitude. Must be between -180 and 180",
        400
      );
    }

    // Remove any existing active location share for this user
    await this.stopSharingLocation(coupleId, userId);

    // Calculate expiration time
    const duration = locationData.duration || 60; // Default 1 hour
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);

    // Create location share
    const locationShare = new LocationShare({
      coupleId: new Types.ObjectId(coupleId),
      userId: new Types.ObjectId(userId),
      lat: locationData.lat,
      lng: locationData.lng,
      sharedAt: new Date(),
      expiresAt,
    });

    await locationShare.save();
    return locationShare.populate("userId", "name email avatarUrl");
  }

  /**
   * Get current shared locations for couple
   */
  public static async getCurrentSharedLocations(
    coupleId: string,
    userId: string
  ): Promise<ILocationShare[]> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

    const now = new Date();
    const locations = await LocationShare.find({
      coupleId: new Types.ObjectId(coupleId),
      expiresAt: { $gt: now },
    })
      .populate("userId", "name email avatarUrl")
      .sort({ sharedAt: -1 });

    return locations;
  }

  /**
   * Get user's current shared location
   */
  public static async getUserCurrentLocation(
    coupleId: string,
    targetUserId: string,
    requestUserId: string
  ): Promise<ILocationShare | null> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, requestUserId);

    const now = new Date();
    const location = await LocationShare.findOne({
      coupleId: new Types.ObjectId(coupleId),
      userId: new Types.ObjectId(targetUserId),
      expiresAt: { $gt: now },
    })
      .populate("userId", "name email avatarUrl")
      .sort({ sharedAt: -1 });

    return location;
  }

  /**
   * Update shared location
   */
  public static async updateLocation(
    coupleId: string,
    userId: string,
    locationData: {
      lat: number;
      lng: number;
      extendDuration?: number; // Additional minutes to extend
    }
  ): Promise<ILocationShare> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

    // Validate coordinates
    if (locationData.lat < -90 || locationData.lat > 90) {
      throw new AppError("Invalid latitude. Must be between -90 and 90", 400);
    }
    if (locationData.lng < -180 || locationData.lng > 180) {
      throw new AppError(
        "Invalid longitude. Must be between -180 and 180",
        400
      );
    }

    const now = new Date();
    const currentLocation = await LocationShare.findOne({
      coupleId: new Types.ObjectId(coupleId),
      userId: new Types.ObjectId(userId),
      expiresAt: { $gt: now },
    });

    if (!currentLocation) {
      throw new AppError("No active location sharing found", 404);
    }

    // Update coordinates
    currentLocation.lat = locationData.lat;
    currentLocation.lng = locationData.lng;
    currentLocation.sharedAt = new Date();

    // Extend duration if requested
    if (locationData.extendDuration && locationData.extendDuration > 0) {
      const additionalTime = locationData.extendDuration * 60 * 1000;
      currentLocation.expiresAt = new Date(
        currentLocation.expiresAt.getTime() + additionalTime
      );
    }

    await currentLocation.save();
    return currentLocation.populate("userId", "name email avatarUrl");
  }

  /**
   * Stop sharing location
   */
  public static async stopSharingLocation(
    coupleId: string,
    userId: string
  ): Promise<void> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

    await LocationShare.deleteMany({
      coupleId: new Types.ObjectId(coupleId),
      userId: new Types.ObjectId(userId),
    });
  }

  /**
   * Extend location sharing duration
   */
  public static async extendLocationSharing(
    coupleId: string,
    userId: string,
    additionalMinutes: number
  ): Promise<ILocationShare> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

    if (additionalMinutes <= 0 || additionalMinutes > 1440) {
      // Max 24 hours
      throw new AppError("Additional minutes must be between 1 and 1440", 400);
    }

    const now = new Date();
    const currentLocation = await LocationShare.findOne({
      coupleId: new Types.ObjectId(coupleId),
      userId: new Types.ObjectId(userId),
      expiresAt: { $gt: now },
    });

    if (!currentLocation) {
      throw new AppError("No active location sharing found", 404);
    }

    const additionalTime = additionalMinutes * 60 * 1000;
    currentLocation.expiresAt = new Date(
      currentLocation.expiresAt.getTime() + additionalTime
    );

    await currentLocation.save();
    return currentLocation.populate("userId", "name email avatarUrl");
  }

  /**
   * Get location sharing history
   */
  public static async getLocationHistory(
    coupleId: string,
    userId: string,
    options: {
      targetUserId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    locations: ILocationShare[];
    total: number;
  }> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

    let query: any = { coupleId: new Types.ObjectId(coupleId) };

    // Filter by target user
    if (options.targetUserId) {
      query.userId = new Types.ObjectId(options.targetUserId);
    }

    // Filter by date range
    if (options.startDate || options.endDate) {
      query.sharedAt = {};
      if (options.startDate) query.sharedAt.$gte = options.startDate;
      if (options.endDate) query.sharedAt.$lte = options.endDate;
    }

    const total = await LocationShare.countDocuments(query);

    let locationsQuery = LocationShare.find(query)
      .populate("userId", "name email avatarUrl")
      .sort({ sharedAt: -1 });

    if (options.limit) {
      locationsQuery = locationsQuery.limit(options.limit);
    }

    if (options.offset) {
      locationsQuery = locationsQuery.skip(options.offset);
    }

    const locations = await locationsQuery.exec();

    return { locations, total };
  }

  /**
   * Calculate distance between two users
   */
  public static async calculateDistanceBetweenUsers(
    coupleId: string,
    userId: string
  ): Promise<{
    distance: number | null;
    unit: "km";
    user1Location: ILocationShare | null;
    user2Location: ILocationShare | null;
  }> {
    // Verify user belongs to couple
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

    if (couple.users.length !== 2) {
      throw new AppError(
        "Distance calculation requires exactly 2 users in couple",
        400
      );
    }

    const now = new Date();
    const [user1Location, user2Location] = await Promise.all([
      LocationShare.findOne({
        coupleId: new Types.ObjectId(coupleId),
        userId: couple.users[0],
        expiresAt: { $gt: now },
      }).populate("userId", "name email avatarUrl"),
      LocationShare.findOne({
        coupleId: new Types.ObjectId(coupleId),
        userId: couple.users[1],
        expiresAt: { $gt: now },
      }).populate("userId", "name email avatarUrl"),
    ]);

    let distance: number | null = null;

    if (user1Location && user2Location) {
      distance = this.calculateHaversineDistance(
        user1Location.lat,
        user1Location.lng,
        user2Location.lat,
        user2Location.lng
      );
    }

    return {
      distance,
      unit: "km",
      user1Location,
      user2Location,
    };
  }

  /**
   * Get location sharing statistics
   */
  public static async getLocationStats(
    coupleId: string,
    userId: string
  ): Promise<{
    totalShares: number;
    activeShares: number;
    byUser: { [userId: string]: number };
    thisWeek: number;
    averageDistance: number | null;
  }> {
    // Verify user belongs to couple
    await this.verifyCoupleAccess(coupleId, userId);

    const coupleObjectId = new Types.ObjectId(coupleId);
    const now = new Date();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalShares, activeShares, thisWeek, userStats] = await Promise.all([
      LocationShare.countDocuments({ coupleId: coupleObjectId }),
      LocationShare.countDocuments({
        coupleId: coupleObjectId,
        expiresAt: { $gt: now },
      }),
      LocationShare.countDocuments({
        coupleId: coupleObjectId,
        sharedAt: { $gte: startOfWeek },
      }),
      LocationShare.aggregate([
        { $match: { coupleId: coupleObjectId } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
    ]);

    const byUser: { [userId: string]: number } = {};
    userStats.forEach((stat: any) => {
      byUser[stat._id.toString()] = stat.count;
    });

    // Calculate average distance (simplified - would need more complex logic for real averages)
    const averageDistance = null; // Placeholder for more complex calculation

    return {
      totalShares,
      activeShares,
      byUser,
      thisWeek,
      averageDistance,
    };
  }

  /**
   * Clean up expired location shares (utility method)
   */
  public static async cleanupExpiredShares(): Promise<number> {
    const now = new Date();
    const result = await LocationShare.deleteMany({
      expiresAt: { $lte: now },
    });

    return result.deletedCount || 0;
  }

  /**
   * Calculate Haversine distance between two coordinates
   */
  private static calculateHaversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
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
