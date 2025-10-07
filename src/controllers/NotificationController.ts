import { Request, Response } from "express";
import { Types } from "mongoose";
import { notificationService } from "../services/NotificationService";
import { sendSuccess } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

export class NotificationController {
  // Get pending notifications for a couple
  getPendingNotifications = asyncHandler(
    async (req: Request, res: Response) => {
      const { coupleId } = req.params;

      if (!Types.ObjectId.isValid(coupleId)) {
        throw new AppError("Invalid couple ID", 400);
      }

      // Verify user has access to this couple (should be done in middleware)
      // For now, assuming auth middleware handles this

      const notifications = await notificationService.getPendingNotifications(
        new Types.ObjectId(coupleId)
      );

      return sendSuccess(
        res,
        "Pending notifications retrieved successfully",
        notifications
      );
    }
  );

  // Update notification settings for a note
  updateNoteNotificationSettings = asyncHandler(
    async (req: Request, res: Response) => {
      const { noteId } = req.params;
      const { notificationEnabled, reminderDate } = req.body;

      if (!Types.ObjectId.isValid(noteId)) {
        throw new AppError("Invalid note ID", 400);
      }

      // Validate reminderDate if provided
      if (reminderDate && !Date.parse(reminderDate)) {
        throw new AppError("Invalid reminder date format", 400);
      }

      const settings: any = {};
      if (notificationEnabled !== undefined) {
        settings.notificationEnabled = Boolean(notificationEnabled);
      }
      if (reminderDate !== undefined) {
        settings.reminderDate = new Date(reminderDate);
      }

      await notificationService.updateNoteNotificationSettings(
        new Types.ObjectId(noteId),
        settings
      );

      return sendSuccess(
        res,
        "Note notification settings updated successfully"
      );
    }
  );

  // Manually trigger notification check (admin/debug endpoint)
  triggerNotificationCheck = asyncHandler(
    async (_req: Request, res: Response) => {
      // This should probably be protected with admin middleware
      await notificationService.scheduleNotifications();

      return sendSuccess(res, "Notification check triggered successfully");
    }
  );

  // Get notification history for a couple
  getNotificationHistory = asyncHandler(async (req: Request, res: Response) => {
    const { coupleId } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    if (!Types.ObjectId.isValid(coupleId)) {
      throw new AppError("Invalid couple ID", 400);
    }

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    if (pageNumber < 1 || limitNumber < 1 || limitNumber > 100) {
      throw new AppError("Invalid pagination parameters", 400);
    }

    // Build query for notification history
    const query: any = { coupleId: new Types.ObjectId(coupleId) };

    if (type === "anniversary") {
      // Get anniversaries with reminder history
      const { Anniversary } = await import("../database/models/Anniversary");
      const anniversaries = await Anniversary.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

      return sendSuccess(
        res,
        "Anniversary notification history retrieved successfully",
        {
          data: anniversaries,
          pagination: {
            page: pageNumber,
            limit: limitNumber,
            hasMore: anniversaries.length === limitNumber,
          },
        }
      );
    } else if (type === "note") {
      // Get notes with notification history
      const { Note } = await import("../database/models/Note");
      const notes = await Note.find({
        ...query,
        notificationEnabled: true,
      })
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

      return sendSuccess(
        res,
        "Note notification history retrieved successfully",
        {
          data: notes,
          pagination: {
            page: pageNumber,
            limit: limitNumber,
            hasMore: notes.length === limitNumber,
          },
        }
      );
    } else {
      // Get both types
      const [anniversaries, notes] = await Promise.all([
        (async () => {
          const { Anniversary } = await import(
            "../database/models/Anniversary"
          );
          return Anniversary.find(query)
            .sort({ createdAt: -1 })
            .limit(Math.ceil(limitNumber / 2));
        })(),
        (async () => {
          const { Note } = await import("../database/models/Note");
          return Note.find({
            ...query,
            notificationEnabled: true,
          })
            .sort({ createdAt: -1 })
            .limit(Math.ceil(limitNumber / 2));
        })(),
      ]);

      return sendSuccess(res, "Notification history retrieved successfully", {
        anniversaries,
        notes,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
        },
      });
    }
  });

  // Get notification statistics for a couple
  getNotificationStats = asyncHandler(async (req: Request, res: Response) => {
    const { coupleId } = req.params;

    if (!Types.ObjectId.isValid(coupleId)) {
      throw new AppError("Invalid couple ID", 400);
    }

    const coupleObjectId = new Types.ObjectId(coupleId);

    // Get stats from different collections
    const [anniversaryStats, noteStats] = await Promise.all([
      (async () => {
        const { Anniversary } = await import("../database/models/Anniversary");
        const [total, upcoming] = await Promise.all([
          Anniversary.countDocuments({ coupleId: coupleObjectId }),
          Anniversary.countDocuments({
            coupleId: coupleObjectId,
            $expr: {
              $or: [
                {
                  $and: [
                    { $eq: ["$repeatAnnually", false] },
                    { $gte: ["$date", new Date()] },
                  ],
                },
                { $eq: ["$repeatAnnually", true] },
              ],
            },
          }),
        ]);
        return { total, upcoming };
      })(),
      (async () => {
        const { Note } = await import("../database/models/Note");
        const [total, withNotifications, pending] = await Promise.all([
          Note.countDocuments({ coupleId: coupleObjectId }),
          Note.countDocuments({
            coupleId: coupleObjectId,
            notificationEnabled: true,
          }),
          Note.countDocuments({
            coupleId: coupleObjectId,
            notificationEnabled: true,
            notificationSent: false,
            reminderDate: { $gte: new Date() },
          }),
        ]);
        return { total, withNotifications, pending };
      })(),
    ]);

    const stats = {
      anniversaries: anniversaryStats,
      notes: noteStats,
      totalNotificationsEnabled:
        anniversaryStats.upcoming + noteStats.withNotifications,
      totalPendingNotifications: anniversaryStats.upcoming + noteStats.pending,
    };

    return sendSuccess(
      res,
      "Notification statistics retrieved successfully",
      stats
    );
  });
}

export const notificationController = new NotificationController();
