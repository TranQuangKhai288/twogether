import { Router } from "express";
import userRoutes from "./userRoutes";
import authRoutes from "./authRoutes";
import { coupleRoutes } from "./coupleRoutes.js";
import anniversaryRoutes from "./anniversaryRoutes";
import photoRoutes from "./photoRoutes";
import moodRoutes from "./moodRoutes";
import locationRoutes from "./locationRoutes";
import noteRoutes from "./noteRoutes";
import notificationRoutes from "./notificationRoutes";

const router = Router();

// Welcome message for API
router.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Welcome to Two Gether API",
    data: {
      version: "1.0.0",
      documentation: "/api/docs",
      endpoints: {
        auth: "/api/auth",
        users: "/api/users",
        couples: "/api/couples",
        anniversaries: "/api/anniversaries",
        photos: "/api/photos",
        moods: "/api/moods",
        locations: "/api/locations",
        notes: "/api/notes",
        notifications: "/api/notifications",
        health: "/health",
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// Mount route modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/couples", coupleRoutes);
router.use("/anniversaries", anniversaryRoutes);
router.use("/photos", photoRoutes);
router.use("/moods", moodRoutes);
router.use("/locations", locationRoutes);
router.use("/notes", noteRoutes);
router.use("/notifications", notificationRoutes);

export default router;
