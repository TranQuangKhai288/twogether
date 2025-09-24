import { Router } from "express";
import { NoteController } from "@/controllers/NoteController";
import { protect } from "@/middleware/auth";
import { validateBody } from "@/middleware/validation";

const router = Router();
const noteController = new NoteController();

// Apply authentication middleware to all note routes
router.use(protect);

// Validation rules
const createNoteRules = {
  coupleId: { required: true, type: "mongoId" },
  content: { required: true, type: "string", minLength: 1, maxLength: 5000 },
  tags: { required: false, type: "array" },
  isPrivate: { required: false, type: "boolean" },
};

const updateNoteRules = {
  content: { required: false, type: "string", minLength: 1, maxLength: 5000 },
  tags: { required: false, type: "array" },
  isPrivate: { required: false, type: "boolean" },
};

// Routes
/**
 * @route   POST /api/notes
 * @desc    Create a new note
 * @access  Private
 */
router.post("/", validateBody(createNoteRules), noteController.createNote);

/**
 * @route   GET /api/notes
 * @desc    Get notes for a couple with pagination and filtering
 * @access  Private
 * @query   coupleId, page, limit, tags (comma-separated), search
 */
router.get("/", noteController.getCoupleNotes);

/**
 * @route   GET /api/notes/search
 * @desc    Search notes with text search
 * @access  Private
 * @query   coupleId, q (search query), page, limit
 */
router.get("/search", noteController.searchNotes);

/**
 * @route   GET /api/notes/tags/:coupleId
 * @desc    Get all tags used by a couple
 * @access  Private
 */
router.get("/tags/:coupleId", noteController.getCoupleTags);

/**
 * @route   GET /api/notes/:id
 * @desc    Get note by ID
 * @access  Private
 */
router.get("/:id", noteController.getNoteById);

/**
 * @route   PUT /api/notes/:id
 * @desc    Update note
 * @access  Private (only author)
 */
router.put("/:id", validateBody(updateNoteRules), noteController.updateNote);

/**
 * @route   DELETE /api/notes/:id
 * @desc    Delete note
 * @access  Private (only author)
 */
router.delete("/:id", noteController.deleteNote);

export default router;
