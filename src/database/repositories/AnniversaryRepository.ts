import { Types } from "mongoose";
import { Anniversary, IAnniversary } from "../models/Anniversary";
import { AppError } from "../../utils/AppError";

export class AnniversaryRepository {
  /**
   * Create a new anniversary (pure data access)
   */
  async create(
    coupleId: string,
    anniversaryData: {
      title: string;
      date: Date;
      remindBefore: number;
      repeatAnnually: boolean;
    }
  ): Promise<IAnniversary> {
    try {
      const anniversary = new Anniversary({
        coupleId: new Types.ObjectId(coupleId),
        ...anniversaryData,
      });
      await anniversary.save();
      return anniversary;
    } catch (error) {
      throw new AppError("Failed to create anniversary", 500);
    }
  }

  /**
   * Find anniversary by ID (pure data access)
   */
  async findById(anniversaryId: string): Promise<IAnniversary | null> {
    try {
      return await Anniversary.findById(anniversaryId);
    } catch (error) {
      throw new AppError("Failed to find anniversary", 500);
    }
  }

  /**
   * Find anniversaries by filters (pure data access)
   */
  async findByFilters(
    filters: any,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ): Promise<IAnniversary[]> {
    try {
      const { limit, offset = 0, sortBy = "date", sortOrder = "asc" } = options;

      const sortOptions: any = {};
      sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

      let query = Anniversary.find(filters).sort(sortOptions).skip(offset);

      if (limit) {
        query = query.limit(limit);
      }

      return await query.exec();
    } catch (error) {
      throw new AppError("Failed to find anniversaries", 500);
    }
  }

  /**
   * Count anniversaries by filters (pure data access)
   */
  async countByFilters(filters: any): Promise<number> {
    try {
      return await Anniversary.countDocuments(filters);
    } catch (error) {
      throw new AppError("Failed to count anniversaries", 500);
    }
  }

  /**
   * Update anniversary (pure data access)
   */
  async update(
    anniversaryId: string,
    updateData: any
  ): Promise<IAnniversary | null> {
    try {
      return await Anniversary.findByIdAndUpdate(
        anniversaryId,
        { $set: updateData },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new AppError("Failed to update anniversary", 500);
    }
  }

  /**
   * Delete anniversary (pure data access)
   */
  async delete(anniversaryId: string): Promise<boolean> {
    try {
      const result = await Anniversary.findByIdAndDelete(anniversaryId);
      return !!result;
    } catch (error) {
      throw new AppError("Failed to delete anniversary", 500);
    }
  }

  /**
   * Find anniversaries by couple ID (pure data access)
   */
  async findByCoupleId(
    coupleId: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ): Promise<IAnniversary[]> {
    try {
      const filters = { coupleId: new Types.ObjectId(coupleId) };
      return await this.findByFilters(filters, options);
    } catch (error) {
      throw new AppError("Failed to find anniversaries by couple", 500);
    }
  }

  /**
   * Count anniversaries by couple ID (pure data access)
   */
  async countByCoupleId(coupleId: string): Promise<number> {
    try {
      const filters = { coupleId: new Types.ObjectId(coupleId) };
      return await this.countByFilters(filters);
    } catch (error) {
      throw new AppError("Failed to count anniversaries by couple", 500);
    }
  }
}
