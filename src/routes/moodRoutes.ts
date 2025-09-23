import { Router } from "express";
import { MoodController } from "../controllers/MoodController";
import { protect } from "../middleware/auth";

const router = Router();
const moodController = new MoodController();

// Apply auth middleware to all routes
router.use(protect);

/**
 * @route   POST /api/moods
 * @desc    Create a new mood entry
 * @access  Private
 */
router.post("/", moodController.createMood);

/**
 * @route   GET /api/moods/couple/:coupleId/user/:userId/latest
 * @desc    Get latest mood for a specific user
 * @access  Private
 */
router.get(
  "/couple/:coupleId/user/:userId/latest",
  moodController.getLatestMoodForUser
);

/**
 * @route   GET /api/moods/couple/:coupleId/history
 * @desc    Get mood history for a couple
 * @access  Private
 * @query   limit, offset, startDate, endDate, targetUserId
 */
router.get("/couple/:coupleId/history", moodController.getMoodHistory);

/**
 * @route   GET /api/moods/:id
 * @desc    Get mood by ID
 * @access  Private
 */
router.get("/:id", moodController.getMoodById);

/**
 * @route   PUT /api/moods/:id
 * @desc    Update mood entry
 * @access  Private
 */
router.put("/:id", moodController.updateMood);

/**
 * @route   DELETE /api/moods/:id
 * @desc    Delete mood entry
 * @access  Private
 */
router.delete("/:id", moodController.deleteMood);

/**
 * @route   GET /api/moods/couple/:coupleId/stats
 * @desc    Get mood statistics for a couple
 * @access  Private
 * @query   startDate, endDate, targetUserId
 */
router.get("/couple/:coupleId/stats", moodController.getMoodStats);

/**
 * @route   GET /api/moods/couple/:coupleId/trends
 * @desc    Get mood trends over time
 * @access  Private
 * @query   period (week|month|year), targetUserId
 */
router.get("/couple/:coupleId/trends", moodController.getMoodTrends);

/**
 * @route   GET /api/moods/couple/:coupleId/status
 * @desc    Get current mood status for both users in couple
 * @access  Private
 */
router.get("/couple/:coupleId/status", moodController.getCurrentMoodStatus);

export default router;
