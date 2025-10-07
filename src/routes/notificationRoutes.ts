import { Router } from "express";
import { notificationController } from "../controllers/NotificationController";
import { protect } from "../middleware/auth";
import { validateBody } from "../middleware/validation";
import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { AppError } from "../utils/AppError";

const router = Router();

// All notification routes require authentication
router.use(protect);

// Custom validation middleware for MongoDB ObjectId
const validateObjectId = (paramName: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    if (!Types.ObjectId.isValid(id)) {
      return next(new AppError(`Invalid ${paramName}`, 400));
    }
    next();
  };
};

// Custom validation for notification settings
const validateNotificationSettings = validateBody({
  notificationEnabled: {
    required: false,
    custom: (value: any) => {
      if (value !== undefined && typeof value !== "boolean") {
        throw new Error("Notification enabled must be a boolean");
      }
      return true;
    },
  },
  reminderDate: {
    required: false,
    custom: (value: any) => {
      if (value !== undefined) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error("Invalid reminder date format");
        }
        if (date < new Date()) {
          throw new Error("Reminder date cannot be in the past");
        }
      }
      return true;
    },
  },
});

// Custom validation for pagination
const validatePagination = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { page, limit, type } = req.query;

  if (page && (isNaN(Number(page)) || Number(page) < 1)) {
    return next(new AppError("Page must be a positive integer", 400));
  }

  if (
    limit &&
    (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)
  ) {
    return next(new AppError("Limit must be between 1 and 100", 400));
  }

  if (type && !["anniversary", "note"].includes(type as string)) {
    return next(new AppError("Type must be either anniversary or note", 400));
  }

  next();
};

// Routes

/**
 * @route   GET /api/notifications/couples/:coupleId/pending
 * @desc    Get pending notifications for a couple
 * @access  Private
 */
router.get(
  "/couples/:coupleId/pending",
  validateObjectId("coupleId"),
  notificationController.getPendingNotifications
);

/**
 * @route   PUT /api/notifications/notes/:noteId/settings
 * @desc    Update notification settings for a note
 * @access  Private
 */
router.put(
  "/notes/:noteId/settings",
  validateObjectId("noteId"),
  validateNotificationSettings,
  notificationController.updateNoteNotificationSettings
);

/**
 * @route   POST /api/notifications/trigger
 * @desc    Manually trigger notification check (admin/debug)
 * @access  Private (should be admin only)
 */
router.post("/trigger", notificationController.triggerNotificationCheck);

/**
 * @route   GET /api/notifications/couples/:coupleId/history
 * @desc    Get notification history for a couple
 * @access  Private
 */
router.get(
  "/couples/:coupleId/history",
  validateObjectId("coupleId"),
  validatePagination,
  notificationController.getNotificationHistory
);

/**
 * @route   GET /api/notifications/couples/:coupleId/stats
 * @desc    Get notification statistics for a couple
 * @access  Private
 */
router.get(
  "/couples/:coupleId/stats",
  validateObjectId("coupleId"),
  notificationController.getNotificationStats
);

export default router;
