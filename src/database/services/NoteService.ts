import { Types } from 'mongoose';
import { Note, INote } from '../models/Note.js';
import { AppError } from '@/middleware/errorHandler.js';
import { CoupleService } from './CoupleService.js';

export class NoteService {
  private coupleService = new CoupleService();

  /**
   * Create a new note
   */
  async createNote(noteData: {
    coupleId: string | Types.ObjectId;
    authorId: string | Types.ObjectId;
    content: string;
    tags?: string[];
    isPrivate?: boolean;
  }): Promise<INote> {
    try {
      // Verify user belongs to couple
      const isUserInCouple = await this.coupleService.isUserInCouple(noteData.coupleId, noteData.authorId);
      if (!isUserInCouple) {
        throw new AppError('User does not belong to this couple', 403);
      }

      const note = new Note(noteData);
      await note.save();

      return await note.populate('authorId', 'name avatarUrl');
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create note', 500);
    }
  }

  /**
   * Get notes for a couple
   */
  async getNotesByCouple(
    coupleId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 20,
    tags?: string[],
    searchTerm?: string
  ): Promise<{
    notes: INote[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      // Verify user belongs to couple
      const isUserInCouple = await this.coupleService.isUserInCouple(coupleId, userId);
      if (!isUserInCouple) {
        throw new AppError('User does not belong to this couple', 403);
      }

      const skip = (page - 1) * limit;
      
      // Build query
      let query: any = { coupleId };
      
      // Show private notes only to their authors
      query.$or = [
        { isPrivate: false },
        { isPrivate: true, authorId: userId },
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
          .populate('authorId', 'name avatarUrl')
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
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get notes', 500);
    }
  }

  /**
   * Get note by ID
   */
  async getNoteById(
    noteId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<INote | null> {
    try {
      const note = await Note.findById(noteId).populate('authorId', 'name avatarUrl');
      if (!note) {
        throw new AppError('Note not found', 404);
      }

      // Verify user belongs to couple
      const isUserInCouple = await this.coupleService.isUserInCouple(note.coupleId, userId);
      if (!isUserInCouple) {
        throw new AppError('User does not belong to this couple', 403);
      }

      // Check if user can view private note
      if (note.isPrivate && !note.authorId.equals(userId)) {
        throw new AppError('Access denied to private note', 403);
      }

      return note;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get note', 500);
    }
  }

  /**
   * Update note
   */
  async updateNote(
    noteId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    updateData: {
      content?: string;
      tags?: string[];
      isPrivate?: boolean;
    }
  ): Promise<INote | null> {
    try {
      const note = await Note.findById(noteId);
      if (!note) {
        throw new AppError('Note not found', 404);
      }

      // Only author can update their note
      if (!note.authorId.equals(userId)) {
        throw new AppError('Only the author can update this note', 403);
      }

      const updatedNote = await Note.findByIdAndUpdate(
        noteId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate('authorId', 'name avatarUrl');

      return updatedNote;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update note', 500);
    }
  }

  /**
   * Delete note
   */
  async deleteNote(
    noteId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<void> {
    try {
      const note = await Note.findById(noteId);
      if (!note) {
        throw new AppError('Note not found', 404);
      }

      // Only author can delete their note
      if (!note.authorId.equals(userId)) {
        throw new AppError('Only the author can delete this note', 403);
      }

      await Note.findByIdAndDelete(noteId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete note', 500);
    }
  }

  /**
   * Get all tags used by a couple
   */
  async getTagsByCouple(coupleId: string | Types.ObjectId): Promise<string[]> {
    try {
      const tags = await Note.distinct('tags', { coupleId });
      return tags.sort();
    } catch (error) {
      throw new AppError('Failed to get tags', 500);
    }
  }

  /**
   * Search notes
   */
  async searchNotes(
    coupleId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    searchTerm: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    notes: INote[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      // Verify user belongs to couple
      const isUserInCouple = await this.coupleService.isUserInCouple(coupleId, userId);
      if (!isUserInCouple) {
        throw new AppError('User does not belong to this couple', 403);
      }

      const skip = (page - 1) * limit;

      const query = {
        coupleId,
        $or: [
          { isPrivate: false },
          { isPrivate: true, authorId: userId },
        ],
        $text: { $search: searchTerm },
      };

      const [notes, total] = await Promise.all([
        Note.find(query, { score: { $meta: 'textScore' } })
          .populate('authorId', 'name avatarUrl')
          .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
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
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to search notes', 500);
    }
  }
}