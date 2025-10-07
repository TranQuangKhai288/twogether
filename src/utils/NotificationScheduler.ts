import { notificationService } from "../services/NotificationService";
import { logger } from "../utils/logger";

interface ScheduledJob {
  id: string;
  name: string;
  interval: NodeJS.Timeout;
  isRunning: boolean;
}

export class NotificationScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();

  /**
   * Start the notification scheduler
   */
  start(): void {
    // Check notifications every hour (3600000 ms = 1 hour)
    const hourlyInterval = setInterval(
      async () => {
        try {
          logger.info("Running hourly notification check...");
          await notificationService.scheduleNotifications();
          logger.info("Hourly notification check completed");
        } catch (error) {
          logger.error("Error in hourly notification check:", error);
        }
      },
      60 * 60 * 1000
    ); // 1 hour

    // Check note reminders every 30 minutes
    const noteReminderInterval = setInterval(
      async () => {
        try {
          logger.info("Running note reminder check...");
          await notificationService.checkAndSendNoteReminders();
          logger.info("Note reminder check completed");
        } catch (error) {
          logger.error("Error in note reminder check:", error);
        }
      },
      30 * 60 * 1000
    ); // 30 minutes

    // Check anniversary notifications daily
    const anniversaryInterval = setInterval(async () => {
      try {
        const now = new Date();
        // Only run at 8 AM (adjust for your timezone)
        if (now.getHours() === 8 && now.getMinutes() === 0) {
          logger.info("Running anniversary notification check...");
          await notificationService.checkAndSendAnniversaryReminders();
          logger.info("Anniversary notification check completed");
        }
      } catch (error) {
        logger.error("Error in anniversary notification check:", error);
      }
    }, 60 * 1000); // Check every minute but only run at 8 AM

    // Store intervals for management
    this.jobs.set("hourly-notifications", {
      id: "hourly-notifications",
      name: "Hourly Notifications",
      interval: hourlyInterval,
      isRunning: true,
    });

    this.jobs.set("note-reminders", {
      id: "note-reminders",
      name: "Note Reminders",
      interval: noteReminderInterval,
      isRunning: true,
    });

    this.jobs.set("anniversary-notifications", {
      id: "anniversary-notifications",
      name: "Anniversary Notifications",
      interval: anniversaryInterval,
      isRunning: true,
    });

    logger.info("Notification scheduler started with following jobs:");
    logger.info("- Hourly notifications: Every hour");
    logger.info("- Note reminders: Every 30 minutes");
    logger.info("- Anniversary notifications: Daily at 8:00 AM");

    // Initial run
    this.triggerNotificationCheck().catch((error) => {
      logger.error("Error in initial notification check:", error);
    });
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    this.jobs.forEach((job, name) => {
      clearInterval(job.interval);
      job.isRunning = false;
      logger.info(`Stopped notification job: ${name}`);
    });
    this.jobs.clear();
    logger.info("All notification jobs stopped");
  }

  /**
   * Stop a specific scheduled task
   */
  stopJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (job) {
      clearInterval(job.interval);
      job.isRunning = false;
      this.jobs.delete(jobName);
      logger.info(`Stopped notification job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Get status of all jobs
   */
  getJobStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.jobs.forEach((job, name) => {
      status[name] = job.isRunning;
    });
    return status;
  }

  /**
   * Manually trigger a notification check
   */
  async triggerNotificationCheck(): Promise<void> {
    try {
      logger.info("Manually triggering notification check...");
      await notificationService.scheduleNotifications();
      logger.info("Manual notification check completed");
    } catch (error) {
      logger.error("Error in manual notification check:", error);
      throw error;
    }
  }

  /**
   * Restart a specific job with new interval
   */
  restartJob(jobName: string, intervalMs: number): boolean {
    const job = this.jobs.get(jobName);
    if (job) {
      // Stop existing interval
      clearInterval(job.interval);

      // Create new interval based on job type
      let newInterval: NodeJS.Timeout;

      switch (jobName) {
        case "hourly-notifications":
          newInterval = setInterval(async () => {
            try {
              await notificationService.scheduleNotifications();
            } catch (error) {
              logger.error("Error in scheduled notification check:", error);
            }
          }, intervalMs);
          break;
        case "note-reminders":
          newInterval = setInterval(async () => {
            try {
              await notificationService.checkAndSendNoteReminders();
            } catch (error) {
              logger.error("Error in note reminder check:", error);
            }
          }, intervalMs);
          break;
        case "anniversary-notifications":
          newInterval = setInterval(async () => {
            try {
              await notificationService.checkAndSendAnniversaryReminders();
            } catch (error) {
              logger.error("Error in anniversary notification check:", error);
            }
          }, intervalMs);
          break;
        default:
          return false;
      }

      // Update job
      job.interval = newInterval;
      job.isRunning = true;

      logger.info(`Restarted job ${jobName} with interval ${intervalMs}ms`);
      return true;
    }
    return false;
  }
}

export const notificationScheduler = new NotificationScheduler();
