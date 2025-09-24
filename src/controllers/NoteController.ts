import { Request, Response } from "express";
import { NoteService } from "@/services/NoteService";
import { NoteRepository } from "@/database/repositories/NoteRepository";
import { CoupleService } from "@/services/CoupleService";
import { sendSuccess } from "@/utils/response";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/AppError";

export class NoteController {
  private noteService: NoteService;

  constructor() {
    const noteRepository = new NoteRepository();
    const coupleService = new CoupleService();
    this.noteService = new NoteService(noteRepository, coupleService);
  }

  /**
   * Create a new note
   * POST /notes
   */
  createNote = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const { coupleId, content, tags, isPrivate } = req.body;

    if (!coupleId || !content) {
      throw new AppError("Couple ID and content are required", 400);
    }

    const note = await this.noteService.createNote({
      coupleId,
      authorId: userId,
      content,
      tags,
      isPrivate,
    });

    return sendSuccess(res, "Note created successfully", note, 201);
  });

  /**
   * Get notes for a couple
   * GET /notes?coupleId=xxx&page=1&limit=20&tags=tag1,tag2&search=term
   */
  getCoupleNotes = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const { coupleId, page, limit, tags, search } = req.query;

    if (!coupleId) {
      throw new AppError("Couple ID is required", 400);
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const tagArray = tags ? (tags as string).split(",") : undefined;

    const result = await this.noteService.getNotesByCouple(
      coupleId as string,
      userId,
      pageNum,
      limitNum,
      tagArray,
      search as string
    );

    return sendSuccess(res, "Notes retrieved successfully", result);
  });

  /**
   * Get note by ID
   * GET /notes/:id
   */
  getNoteById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = req.params;
    const note = await this.noteService.getNoteById(id, userId);

    if (!note) {
      throw new AppError("Note not found", 404);
    }

    return sendSuccess(res, "Note retrieved successfully", note);
  });

  /**
   * Update note
   * PUT /notes/:id
   */
  updateNote = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = req.params;
    const { content, tags, isPrivate } = req.body;

    const note = await this.noteService.updateNote(id, userId, {
      content,
      tags,
      isPrivate,
    });

    if (!note) {
      throw new AppError("Note not found or update failed", 404);
    }

    return sendSuccess(res, "Note updated successfully", note);
  });

  /**
   * Delete note
   * DELETE /notes/:id
   */
  deleteNote = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = req.params;
    await this.noteService.deleteNote(id, userId);

    return sendSuccess(res, "Note deleted successfully");
  });

  /**
   * Get tags for a couple
   * GET /notes/tags/:coupleId
   */
  getCoupleTags = asyncHandler(async (req: Request, res: Response) => {
    const { coupleId } = req.params;
    const tags = await this.noteService.getTagsByCouple(coupleId);

    return sendSuccess(res, "Tags retrieved successfully", { tags });
  });

  /**
   * Search notes
   * GET /notes/search?coupleId=xxx&q=searchterm&page=1&limit=20
   */
  searchNotes = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const { coupleId, q, page, limit } = req.query;

    if (!coupleId || !q) {
      throw new AppError("Couple ID and search query are required", 400);
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;

    const result = await this.noteService.searchNotes(
      coupleId as string,
      userId,
      q as string,
      pageNum,
      limitNum
    );

    return sendSuccess(res, "Search completed successfully", result);
  });
}