import { Types } from "mongoose";
import { Note, INote } from "../models/Note";

export class NoteRepository {
  /**
   * Create a new note
   */
  async create(noteData: {
    coupleId: string;
    authorId: string;
    content: string;
    tags?: string[];
    isPrivate?: boolean;
  }): Promise<INote> {
    const note = new Note({
      coupleId: new Types.ObjectId(noteData.coupleId),
      authorId: new Types.ObjectId(noteData.authorId),
      content: noteData.content,
      tags: noteData.tags || [],
      isPrivate: noteData.isPrivate || false,
    });

    await note.save();
    return await note.populate("authorId", "name avatarUrl");
  }

  /**
   * Find note by ID
   */
  async findById(noteId: string): Promise<INote | null> {
    if (!Types.ObjectId.isValid(noteId)) {
      return null;
    }
    return await Note.findById(noteId).populate("authorId", "name avatarUrl");
  }

  /**
   * Find notes by filters with pagination
   */
  async findByFilters(
    filters: {
      coupleId: string;
      userId: string;
    },
    options: {
      page?: number;
      limit?: number;
      tags?: string[];
      searchTerm?: string;
    } = {}
  ): Promise<{
    notes: INote[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 20, tags, searchTerm } = options;
    const skip = (page - 1) * limit;

    // Build query
    let query: any = { coupleId: new Types.ObjectId(filters.coupleId) };

    // Show private notes only to their authors
    query.$or = [
      { isPrivate: false },
      { isPrivate: true, authorId: new Types.ObjectId(filters.userId) },
    ];

    // Filter by tags if provided
    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    // Search in content if search term provided
    if (searchTerm) {
      query.$text = { $search: searchTerm };
    }

    const [notes, total] = await Promise.all([
      Note.find(query)
        .populate("authorId", "name avatarUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Note.countDocuments(query),
    ]);

    return {
      notes,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  /**
   * Update note by ID
   */
  async update(
    noteId: string,
    updateData: {
      content?: string;
      tags?: string[];
      isPrivate?: boolean;
    }
  ): Promise<INote | null> {
    if (!Types.ObjectId.isValid(noteId)) {
      return null;
    }

    return await Note.findByIdAndUpdate(
      noteId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("authorId", "name avatarUrl");
  }

  /**
   * Delete note by ID
   */
  async delete(noteId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(noteId)) {
      return false;
    }

    const result = await Note.findByIdAndDelete(noteId);
    return !!result;
  }

  /**
   * Get distinct tags by couple ID
   */
  async getDistinctTags(coupleId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(coupleId)) {
      return [];
    }

    const tags = await Note.distinct("tags", {
      coupleId: new Types.ObjectId(coupleId),
    });
    return tags.sort();
  }

  /**
   * Search notes with text search
   */
  async searchNotes(
    coupleId: string,
    userId: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    notes: INote[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;

    const query = {
      coupleId: new Types.ObjectId(coupleId),
      $or: [
        { isPrivate: false },
        { isPrivate: true, authorId: new Types.ObjectId(userId) },
      ],
      $text: { $search: searchTerm },
    };

    const [notes, total] = await Promise.all([
      Note.find(query, { score: { $meta: "textScore" } })
        .populate("authorId", "name avatarUrl")
        .sort({ score: { $meta: "textScore" }, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Note.countDocuments(query),
    ]);

    return {
      notes,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  /**
   * Count notes by filters
   */
  async countByFilters(filters: any): Promise<number> {
    return await Note.countDocuments(filters);
  }

  /**
   * Check if note exists
   */
  async exists(noteId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(noteId)) {
      return false;
    }
    const note = await Note.findById(noteId).select("_id");
    return !!note;
  }
}
