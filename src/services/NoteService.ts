import { Types } from "mongoose";
import { INote, NoteType } from "@/database/models/Note";
import { NoteRepository } from "@/database/repositories/NoteRepository";
import { CoupleService } from "./CoupleService";
import { INoteService } from "./interfaces";
import { AppError } from "@/utils/AppError";
import { notificationService } from "./NotificationService";

export class NoteService implements INoteService {
  constructor(
    private noteRepository: NoteRepository,
    private coupleService: CoupleService
  ) {}

  /**
   * Create a new note with validation
   */
  async createNote(noteData: {
    coupleId: string;
    authorId: string;
    title: string;
    content: string;
    tags?: string[];
    type?: NoteType;
    isPrivate?: boolean;
    reminderDate?: Date;
    notificationEnabled?: boolean;
  }): Promise<INote> {
    // Validate required fields
    if (!noteData.title?.trim()) {
      throw new AppError("Note title is required", 400);
    }

    if (!noteData.content?.trim()) {
      throw new AppError("Note content is required", 400);
    }

    if (noteData.content.length > 5000) {
      throw new AppError("Note content cannot exceed 5000 characters", 400);
    }

    // Validate ObjectIds
    if (!Types.ObjectId.isValid(noteData.coupleId)) {
      throw new AppError("Invalid couple ID", 400);
    }

    if (!Types.ObjectId.isValid(noteData.authorId)) {
      throw new AppError("Invalid author ID", 400);
    }

    // Verify user belongs to couple
    const isUserInCouple = await this.coupleService.isUserInCouple(
      noteData.coupleId,
      noteData.authorId
    );
    if (!isUserInCouple) {
      throw new AppError("User does not belong to this couple", 403);
    }

    // Validate and clean tags
    let tags: string[] = [];
    if (noteData.tags && noteData.tags.length > 0) {
      tags = noteData.tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0 && tag.length <= 20)
        .slice(0, 10); // Limit to 10 tags
    }

    // Validate notification settings
    const noteType = noteData.type || NoteType.GENERAL;
    let reminderDate = noteData.reminderDate;
    let notificationEnabled = noteData.notificationEnabled;

    // Auto-enable notifications for certain types
    if (
      noteType === NoteType.REMINDER ||
      noteType === NoteType.DATE ||
      noteType === NoteType.IMPORTANT
    ) {
      if (notificationEnabled === undefined) {
        notificationEnabled = true;
      }
    } else {
      notificationEnabled = notificationEnabled || false;
    }

    // Validate reminder date for reminder and date types
    if (
      (noteType === NoteType.REMINDER || noteType === NoteType.DATE) &&
      !reminderDate
    ) {
      throw new AppError(
        "Reminder date is required for reminder and date type notes",
        400
      );
    }

    if (reminderDate && new Date(reminderDate) < new Date()) {
      throw new AppError("Reminder date cannot be in the past", 400);
    }

    const note = await this.noteRepository.create({
      coupleId: noteData.coupleId,
      authorId: noteData.authorId,
      title: noteData.title.trim(),
      content: noteData.content.trim(),
      tags,
      type: noteType,
      isPrivate: noteData.isPrivate || false,
      reminderDate,
      notificationEnabled,
      notificationSent: false,
    });

    // If this is a notification-enabled note, we might want to schedule it
    if (notificationEnabled && reminderDate) {
      // In a production environment, you might want to schedule this
      // For now, we'll rely on periodic checks
      await notificationService.updateNoteNotificationSettings(note._id, {
        notificationEnabled,
        reminderDate,
      });
    }

    return note;
  }

  /**
   * Get notes for a couple with pagination and filtering
   */
  async getNotesByCouple(
    coupleId: string,
    userId: string,
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
    // Validate inputs
    if (!Types.ObjectId.isValid(coupleId)) {
      throw new AppError("Invalid couple ID", 400);
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    // Validate pagination
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 20;

    // Verify user belongs to couple
    const isUserInCouple = await this.coupleService.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("User does not belong to this couple", 403);
    }

    // Clean search term
    const cleanSearchTerm = searchTerm?.trim();

    return await this.noteRepository.findByFilters(
      { coupleId, userId },
      {
        page,
        limit,
        tags,
        searchTerm: cleanSearchTerm,
      }
    );
  }

  /**
   * Get note by ID with access control
   */
  async getNoteById(noteId: string, userId: string): Promise<INote | null> {
    if (!Types.ObjectId.isValid(noteId)) {
      throw new AppError("Invalid note ID", 400);
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const note = await this.noteRepository.findById(noteId);
    if (!note) {
      throw new AppError("Note not found", 404);
    }

    // Verify user belongs to couple
    const isUserInCouple = await this.coupleService.isUserInCouple(
      note.coupleId.toString(),
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("User does not belong to this couple", 403);
    }

    // Check if user can view private note
    if (note.isPrivate && !note.authorId.equals(userId)) {
      throw new AppError("Access denied to private note", 403);
    }

    return note;
  }

  /**
   * Update note with validation and authorization
   */
  async updateNote(
    noteId: string,
    userId: string,
    updateData: {
      title?: string;
      content?: string;
      tags?: string[];
      isPrivate?: boolean;
    }
  ): Promise<INote | null> {
    if (!Types.ObjectId.isValid(noteId)) {
      throw new AppError("Invalid note ID", 400);
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const note = await this.noteRepository.findById(noteId);
    if (!note) {
      throw new AppError("Note not found", 404);
    }

    // Only author can update their note
    if (!note.authorId.equals(userId)) {
      throw new AppError("Only the author can update this note", 403);
    }

    // Validate content if provided
    if (updateData.title !== undefined) {
      if (!updateData.title.trim()) {
        throw new AppError("Note title cannot be empty", 400);
      }
      if (updateData.title.length > 100) {
        throw new AppError("Note title cannot exceed 100 characters", 400);
      }
      updateData.title = updateData.title.trim();
    }
    if (updateData.content !== undefined) {
      if (!updateData.content.trim()) {
        throw new AppError("Note content cannot be empty", 400);
      }
      if (updateData.content.length > 5000) {
        throw new AppError("Note content cannot exceed 5000 characters", 400);
      }
      updateData.content = updateData.content.trim();
    }

    // Validate and clean tags if provided
    if (updateData.tags !== undefined) {
      updateData.tags = updateData.tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0 && tag.length <= 20)
        .slice(0, 10); // Limit to 10 tags
    }

    return await this.noteRepository.update(noteId, updateData);
  }

  /**
   * Delete note with authorization
   */
  async deleteNote(noteId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(noteId)) {
      throw new AppError("Invalid note ID", 400);
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const note = await this.noteRepository.findById(noteId);
    if (!note) {
      throw new AppError("Note not found", 404);
    }

    // Only author can delete their note
    if (!note.authorId.equals(userId)) {
      throw new AppError("Only the author can delete this note", 403);
    }

    const deleted = await this.noteRepository.delete(noteId);
    if (!deleted) {
      throw new AppError("Failed to delete note", 500);
    }
  }

  /**
   * Get all tags used by a couple
   */
  async getTagsByCouple(coupleId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(coupleId)) {
      throw new AppError("Invalid couple ID", 400);
    }

    return await this.noteRepository.getDistinctTags(coupleId);
  }

  /**
   * Search notes with validation
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
    // Validate inputs
    if (!Types.ObjectId.isValid(coupleId)) {
      throw new AppError("Invalid couple ID", 400);
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    if (!searchTerm?.trim()) {
      throw new AppError("Search term is required", 400);
    }

    // Validate pagination
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 20;

    // Verify user belongs to couple
    const isUserInCouple = await this.coupleService.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("User does not belong to this couple", 403);
    }

    return await this.noteRepository.searchNotes(
      coupleId,
      userId,
      searchTerm.trim(),
      page,
      limit
    );
  }

  /**
   * Update notification settings for a note
   */
  async updateNotificationSettings(
    noteId: string,
    userId: string,
    settings: {
      notificationEnabled?: boolean;
      reminderDate?: Date;
    }
  ): Promise<INote> {
    // Validate inputs
    if (!Types.ObjectId.isValid(noteId)) {
      throw new AppError("Invalid note ID", 400);
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    // Find the note
    const note = await this.noteRepository.findById(noteId);
    if (!note) {
      throw new AppError("Note not found", 404);
    }

    // Verify user belongs to the couple
    const isUserInCouple = await this.coupleService.isUserInCouple(
      note.coupleId.toString(),
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("User does not belong to this couple", 403);
    }

    // Validate reminder date if provided
    if (settings.reminderDate && new Date(settings.reminderDate) < new Date()) {
      throw new AppError("Reminder date cannot be in the past", 400);
    }

    // Update the note via NotificationService
    await notificationService.updateNoteNotificationSettings(
      new Types.ObjectId(noteId),
      settings
    );

    // Return updated note
    return (await this.noteRepository.findById(noteId)) as INote;
  }

  /**
   * Get notes with pending notifications for a couple
   */
  async getNotesWithPendingNotifications(
    coupleId: string,
    userId: string
  ): Promise<INote[]> {
    // Validate inputs
    if (!Types.ObjectId.isValid(coupleId)) {
      throw new AppError("Invalid couple ID", 400);
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    // Verify user belongs to couple
    const isUserInCouple = await this.coupleService.isUserInCouple(
      coupleId,
      userId
    );
    if (!isUserInCouple) {
      throw new AppError("User does not belong to this couple", 403);
    }

    // Get pending notifications from notification service
    const pendingNotifications =
      await notificationService.getPendingNotifications(
        new Types.ObjectId(coupleId)
      );

    return pendingNotifications.notes;
  }
}
