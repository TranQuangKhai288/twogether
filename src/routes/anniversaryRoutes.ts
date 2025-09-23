import { Router } from "express";
import { AnniversaryController } from "../controllers/AnniversaryController";
import { protect } from "../middleware/auth";

const router = Router();
const anniversaryController = new AnniversaryController();

// Apply auth middleware to all routes
router.use(protect);

/**
 * @route   POST /api/anniversaries
 * @desc    Create a new anniversary
 * @access  Private
 */
router.post("/", anniversaryController.createAnniversary);

/**
 * @route   GET /api/anniversaries/couple/:coupleId
 * @desc    Get anniversaries for a couple
 * @access  Private
 * @query   year, upcoming, limit, offset
 */
router.get("/couple/:coupleId", anniversaryController.getCoupleAnniversaries);

/**
 * @route   GET /api/anniversaries/:id
 * @desc    Get anniversary by ID
 * @access  Private
 */
router.get("/:id", anniversaryController.getAnniversaryById);

/**
 * @route   PUT /api/anniversaries/:id
 * @desc    Update anniversary
 * @access  Private
 */
router.put("/:id", anniversaryController.updateAnniversary);

/**
 * @route   DELETE /api/anniversaries/:id
 * @desc    Delete anniversary
 * @access  Private
 */
router.delete("/:id", anniversaryController.deleteAnniversary);

/**
 * @route   GET /api/anniversaries/couple/:coupleId/upcoming
 * @desc    Get upcoming anniversaries
 * @access  Private
 * @query   days (optional, default 30)
 */
router.get(
  "/couple/:coupleId/upcoming",
  anniversaryController.getUpcomingAnniversaries
);

/**
 * @route   GET /api/anniversaries/couple/:coupleId/date-range
 * @desc    Get anniversaries by date range
 * @access  Private
 * @query   startDate, endDate (required)
 */
router.get(
  "/couple/:coupleId/date-range",
  anniversaryController.getAnniversariesByDateRange
);

/**
 * @route   GET /api/anniversaries/couple/:coupleId/stats
 * @desc    Get anniversary statistics
 * @access  Private
 */
router.get(
  "/couple/:coupleId/stats",
  anniversaryController.getAnniversaryStats
);

export default router;
