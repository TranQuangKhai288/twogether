import { Types } from "mongoose";
import { Note, NoteType } from "../database/models/Note";
import { Anniversary } from "../database/models/Anniversary";
import { logger } from "../utils/logger";

export interface NotificationPayload {
  title: string;
  body: string;
  data?: {
    type: "anniversary" | "note_reminder";
    id: string;
    coupleId: string;
  };
}

export interface PushNotificationToken {
  userId: Types.ObjectId;
  token: string;
  platform: "ios" | "android" | "web";
  isActive: boolean;
}

export class NotificationService {
  // In thực tế, bạn sẽ sử dụng Firebase Cloud Messaging hoặc Apple Push Notification Service
  // Đây là một mock implementation
  async sendPushNotification(
    userIds: Types.ObjectId[],
    payload: NotificationPayload
  ): Promise<void> {
    try {
      logger.info(`Sending push notification to ${userIds.length} users`, {
        userIds: userIds.map((id) => id.toString()),
        payload,
      });

      // TODO: Implement actual push notification sending
      // For now, just log the notification
      for (const userId of userIds) {
        logger.info(`Push notification sent to user: ${userId}`, payload);
      }
    } catch (error) {
      logger.error("Failed to send push notification:", error);
      throw error;
    }
  }

  async checkAndSendAnniversaryReminders(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find anniversaries that should trigger reminders
      const anniversaries = await Anniversary.find({
        $expr: {
          $or: [
            // For non-recurring anniversaries
            {
              $and: [
                { $eq: ["$repeatAnnually", false] },
                {
                  $lte: [
                    {
                      $subtract: [
                        "$date",
                        { $multiply: ["$remindBefore", 24 * 60 * 60 * 1000] },
                      ],
                    },
                    today,
                  ],
                },
                { $gte: ["$date", today] },
              ],
            },
            // For recurring anniversaries
            {
              $and: [
                { $eq: ["$repeatAnnually", true] },
                {
                  $lte: [
                    {
                      $subtract: [
                        {
                          $dateFromParts: {
                            year: { $year: today },
                            month: { $month: "$date" },
                            day: { $dayOfMonth: "$date" },
                          },
                        },
                        { $multiply: ["$remindBefore", 24 * 60 * 60 * 1000] },
                      ],
                    },
                    today,
                  ],
                },
              ],
            },
          ],
        },
      }).populate("coupleId");

      for (const anniversary of anniversaries) {
        await this.sendAnniversaryNotification(anniversary);
      }

      logger.info(`Processed ${anniversaries.length} anniversary reminders`);
    } catch (error) {
      logger.error("Failed to check anniversary reminders:", error);
      throw error;
    }
  }

  async checkAndSendNoteReminders(): Promise<void> {
    try {
      const now = new Date();

      // Find notes that need reminders
      const notes = await Note.find({
        notificationEnabled: true,
        notificationSent: false,
        reminderDate: { $lte: now },
        type: { $in: [NoteType.REMINDER, NoteType.DATE, NoteType.IMPORTANT] },
      }).populate("coupleId");

      for (const note of notes) {
        await this.sendNoteReminderNotification(note);

        // Mark notification as sent
        note.notificationSent = true;
        await note.save();
      }

      logger.info(`Processed ${notes.length} note reminders`);
    } catch (error) {
      logger.error("Failed to check note reminders:", error);
      throw error;
    }
  }

  private async sendAnniversaryNotification(anniversary: any): Promise<void> {
    try {
      const couple = anniversary.coupleId as any;
      if (!couple || !couple.user1Id || !couple.user2Id) {
        logger.warn(`Invalid couple data for anniversary ${anniversary._id}`);
        return;
      }

      const daysUntil = anniversary.daysUntil || 0;
      const isToday = daysUntil === 0;

      const payload: NotificationPayload = {
        title: isToday ? "🎉 Kỷ niệm hôm nay!" : `🔔 Kỷ niệm sắp tới`,
        body: isToday
          ? `Hôm nay là ngày ${anniversary.title}!`
          : `${anniversary.title} sẽ đến trong ${daysUntil} ngày`,
        data: {
          type: "anniversary",
          id: anniversary._id.toString(),
          coupleId: couple._id.toString(),
        },
      };

      const userIds = [couple.user1Id, couple.user2Id];
      await this.sendPushNotification(userIds, payload);

      logger.info(`Anniversary notification sent for: ${anniversary.title}`);
    } catch (error) {
      logger.error(
        `Failed to send anniversary notification for ${anniversary._id}:`,
        error
      );
    }
  }

  private async sendNoteReminderNotification(note: any): Promise<void> {
    try {
      const couple = note.coupleId as any;
      if (!couple || !couple.user1Id || !couple.user2Id) {
        logger.warn(`Invalid couple data for note ${note._id}`);
        return;
      }

      const payload: NotificationPayload = {
        title: this.getNoteNotificationTitle(note.type),
        body: `${note.title}: ${note.content.substring(0, 100)}${note.content.length > 100 ? "..." : ""}`,
        data: {
          type: "note_reminder",
          id: note._id.toString(),
          coupleId: couple._id.toString(),
        },
      };

      const userIds = [couple.user1Id, couple.user2Id];
      await this.sendPushNotification(userIds, payload);

      logger.info(`Note reminder notification sent for: ${note.title}`);
    } catch (error) {
      logger.error(
        `Failed to send note reminder notification for ${note._id}:`,
        error
      );
    }
  }

  private getNoteNotificationTitle(noteType: NoteType): string {
    switch (noteType) {
      case NoteType.REMINDER:
        return "⏰ Nhắc nhở";
      case NoteType.IMPORTANT:
        return "⚠️ Quan trọng";
      case NoteType.DATE:
        return "📅 Ngày đặc biệt";
      case NoteType.TODO:
        return "✅ Việc cần làm";
      default:
        return "📝 Ghi chú";
    }
  }

  async scheduleNotifications(): Promise<void> {
    try {
      await Promise.all([
        this.checkAndSendAnniversaryReminders(),
        this.checkAndSendNoteReminders(),
      ]);

      logger.info("Notification check completed successfully");
    } catch (error) {
      logger.error("Failed to schedule notifications:", error);
      throw error;
    }
  }

  // Method to update notification settings for a note
  async updateNoteNotificationSettings(
    noteId: Types.ObjectId,
    settings: {
      notificationEnabled?: boolean;
      reminderDate?: Date;
    }
  ): Promise<void> {
    try {
      const note = await Note.findById(noteId);
      if (!note) {
        throw new Error("Note not found");
      }

      if (settings.notificationEnabled !== undefined) {
        note.notificationEnabled = settings.notificationEnabled;
        // Reset notification sent status when enabling
        if (settings.notificationEnabled) {
          note.notificationSent = false;
        }
      }

      if (settings.reminderDate !== undefined) {
        note.reminderDate = settings.reminderDate;
        // Reset notification sent status when changing date
        note.notificationSent = false;
      }

      await note.save();
      logger.info(`Updated notification settings for note ${noteId}`);
    } catch (error) {
      logger.error(
        `Failed to update notification settings for note ${noteId}:`,
        error
      );
      throw error;
    }
  }

  // Method to get pending notifications for a couple
  async getPendingNotifications(coupleId: Types.ObjectId): Promise<{
    anniversaries: any[];
    notes: any[];
  }> {
    try {
      const now = new Date();

      // Get upcoming anniversaries
      const anniversaries = await Anniversary.find({
        coupleId,
        $expr: {
          $or: [
            // Non-recurring anniversaries in the future
            {
              $and: [
                { $eq: ["$repeatAnnually", false] },
                { $gte: ["$date", now] },
                {
                  $lte: [
                    {
                      $subtract: [
                        "$date",
                        { $multiply: ["$remindBefore", 24 * 60 * 60 * 1000] },
                      ],
                    },
                    now,
                  ],
                },
              ],
            },
            // Recurring anniversaries
            { $eq: ["$repeatAnnually", true] },
          ],
        },
      });

      // Get pending note reminders
      const notes = await Note.find({
        coupleId,
        notificationEnabled: true,
        notificationSent: false,
        reminderDate: { $gte: now },
        type: { $in: [NoteType.REMINDER, NoteType.DATE, NoteType.IMPORTANT] },
      }).sort({ reminderDate: 1 });

      return {
        anniversaries,
        notes,
      };
    } catch (error) {
      logger.error(
        `Failed to get pending notifications for couple ${coupleId}:`,
        error
      );
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
