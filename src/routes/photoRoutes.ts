import { Router } from "express";
import { PhotoController } from "../controllers/PhotoController";
import { protect } from "../middleware/auth";

const router = Router();
const photoController = new PhotoController();

// Apply auth middleware to all routes
router.use(protect);

/**
 * @route   POST /api/photos
 * @desc    Upload a new photo
 * @access  Private
 */
router.post("/", photoController.uploadPhoto);

/**
 * @route   GET /api/photos/couple/:coupleId
 * @desc    Get photos for a couple
 * @access  Private
 * @query   favoritesOnly, uploaderId, limit, offset, sortBy
 */
router.get("/couple/:coupleId", photoController.getCouplePhotos);

/**
 * @route   GET /api/photos/:id
 * @desc    Get photo by ID
 * @access  Private
 */
router.get("/:id", photoController.getPhotoById);

/**
 * @route   PUT /api/photos/:id
 * @desc    Update photo (caption, favorite status)
 * @access  Private
 */
router.put("/:id", photoController.updatePhoto);

/**
 * @route   DELETE /api/photos/:id
 * @desc    Delete photo
 * @access  Private
 */
router.delete("/:id", photoController.deletePhoto);

/**
 * @route   PATCH /api/photos/:id/favorite
 * @desc    Toggle favorite status
 * @access  Private
 */
router.patch("/:id/favorite", photoController.toggleFavorite);

/**
 * @route   GET /api/photos/couple/:coupleId/favorites
 * @desc    Get favorite photos for a couple
 * @access  Private
 * @query   limit, offset
 */
router.get("/couple/:coupleId/favorites", photoController.getFavoritePhotos);

/**
 * @route   GET /api/photos/couple/:coupleId/uploader/:uploaderId
 * @desc    Get photos by specific uploader
 * @access  Private
 * @query   limit, offset
 */
router.get(
  "/couple/:coupleId/uploader/:uploaderId",
  photoController.getPhotosByUploader
);

/**
 * @route   GET /api/photos/couple/:coupleId/stats
 * @desc    Get photo statistics for a couple
 * @access  Private
 */
router.get("/couple/:coupleId/stats", photoController.getPhotoStats);

/**
 * @route   GET /api/photos/couple/:coupleId/search
 * @desc    Search photos by caption
 * @access  Private
 * @query   q (search term), limit, offset
 */
router.get("/couple/:coupleId/search", photoController.searchPhotos);

export default router;
