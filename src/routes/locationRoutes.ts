import { Router } from "express";
import { LocationController } from "../controllers/LocationController";
import { protect } from "../middleware/auth";

const router = Router();
const locationController = new LocationController();

// Apply auth middleware to all routes
router.use(protect);

/**
 * @route   POST /api/locations/share
 * @desc    Share current location
 * @access  Private
 */
router.post("/share", locationController.shareLocation);

/**
 * @route   GET /api/locations/couple/:coupleId/current
 * @desc    Get current shared locations for couple
 * @access  Private
 */
router.get(
  "/couple/:coupleId/current",
  locationController.getCurrentSharedLocations
);

/**
 * @route   GET /api/locations/couple/:coupleId/user/:userId/current
 * @desc    Get user's current shared location
 * @access  Private
 */
router.get(
  "/couple/:coupleId/user/:userId/current",
  locationController.getUserCurrentLocation
);

/**
 * @route   PUT /api/locations/couple/:coupleId/update
 * @desc    Update shared location
 * @access  Private
 */
router.put("/couple/:coupleId/update", locationController.updateLocation);

/**
 * @route   DELETE /api/locations/couple/:coupleId/stop
 * @desc    Stop sharing location
 * @access  Private
 */
router.delete("/couple/:coupleId/stop", locationController.stopSharingLocation);

/**
 * @route   PATCH /api/locations/couple/:coupleId/extend
 * @desc    Extend location sharing duration
 * @access  Private
 */
router.patch(
  "/couple/:coupleId/extend",
  locationController.extendLocationSharing
);

/**
 * @route   GET /api/locations/couple/:coupleId/history
 * @desc    Get location sharing history
 * @access  Private
 * @query   targetUserId, startDate, endDate, limit, offset
 */
router.get("/couple/:coupleId/history", locationController.getLocationHistory);

/**
 * @route   GET /api/locations/couple/:coupleId/distance
 * @desc    Calculate distance between users
 * @access  Private
 */
router.get(
  "/couple/:coupleId/distance",
  locationController.calculateDistanceBetweenUsers
);

/**
 * @route   GET /api/locations/couple/:coupleId/stats
 * @desc    Get location sharing statistics
 * @access  Private
 */
router.get("/couple/:coupleId/stats", locationController.getLocationStats);

/**
 * @route   POST /api/locations/cleanup
 * @desc    Clean up expired location shares (admin utility)
 * @access  Private
 */
router.post("/cleanup", locationController.cleanupExpiredShares);

export default router;
