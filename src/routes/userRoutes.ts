import { Router } from "express";
import { UserController } from "@/controllers/UserController";
import { protect } from "@/middleware/auth";
import {
  validateUpdateProfile,
  validateChangePassword,
  validateUpdatePreferences,
  validateAdminUpdateUser,
} from "@/middleware/validation";
const router = Router();
const userController = new UserController();

// Apply authentication middleware to all user routes
router.use(protect);

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/profile", userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put("/profile", validateUpdateProfile, userController.updateProfile);

/**
 * @route   POST /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  "/change-password",
  validateChangePassword,
  userController.changePassword
);

/**
 * @route   PUT /api/users/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put(
  "/preferences",
  validateUpdatePreferences,
  userController.updatePreferences
);

/**
 * @route   GET /api/users/couple
 * @desc    Get current user's couple information
 * @access  Private
 */
router.get("/couple", userController.getCoupleInfo);

/**
 * @route   GET /api/users/search
 * @desc    Search users by name or email
 * @access  Private
 */
router.get("/search", userController.searchUsers);

/**
 * @route   GET /api/users
 * @desc    Get all users (with pagination)
 * @access  Private
 */
router.get("/", userController.getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get("/:id", userController.getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user (Admin only)
 * @access  Private
 */
router.put("/:id", validateAdminUpdateUser, userController.updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private
 */
router.delete("/:id", userController.deleteUser);

export default router;
