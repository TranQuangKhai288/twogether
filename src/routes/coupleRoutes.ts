import { Router } from "express";
import { CoupleController } from "../controllers/CoupleController.js";
import { CoupleInvitationController } from "../controllers/CoupleInvitationController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import {
  validateJoinCouple,
  validateUpdateCoupleSettings,
  validateUpdateAnniversaryDate,
  validateSendInvitation,
} from "../middleware/validation.js";

const router = Router();
const coupleController = new CoupleController();
const invitationController = new CoupleInvitationController();

// All routes require authentication
router.use(protect);

// ===========================================
// COUPLE INVITATION SYSTEM
// ===========================================

/**
 * @route   POST /api/couples/invitations
 * @desc    Send couple invitation
 * @access  Private
 * @body    { receiverEmail: string, anniversaryDate: string, message?: string }
 */
router.post(
  "/invitations",
  validateSendInvitation,
  invitationController.sendInvitation
);

/**
 * @route   GET /api/couples/invitations/received
 * @desc    Get user's received invitations
 * @access  Private
 */
router.get("/invitations/received", invitationController.getMyInvitations);

/**
 * @route   GET /api/couples/invitations/sent
 * @desc    Get user's sent invitations
 * @access  Private
 */
router.get("/invitations/sent", invitationController.getMySentInvitations);

/**
 * @route   PATCH /api/couples/invitations/:id
 * @desc    Handle invitation actions (accept/reject/cancel)
 * @access  Private
 * @body    { action: 'accept' | 'reject' | 'cancel' }
 */
router.patch("/invitations/:id", invitationController.handleInvitationAction);

/**
 * @route   GET /api/couples/invitations/:id
 * @desc    Get invitation by ID
 * @access  Private
 */
router.get("/invitations/:id", invitationController.getInvitationById);

// ===========================================
// EXISTING COUPLE MANAGEMENT
// ===========================================

/**
 * @route   POST /api/couples/join
 * @desc    Join a couple using invite code
 * @access  Private
 * @body    { inviteCode: string }
 */
router.post("/join", validateJoinCouple, coupleController.joinCouple);

/**
 * @route   GET /api/couples/me
 * @desc    Get current user's couple information
 * @access  Private
 */
router.get("/me", coupleController.getMyCouple);

/**
 * @route   GET /api/couples/partner
 * @desc    Get partner information
 * @access  Private
 */
router.get("/partner", coupleController.getPartner);

/**
 * @route   GET /api/couples/stats
 * @desc    Get couple statistics
 * @access  Private
 */
router.get("/stats", coupleController.getCoupleStats);

/**
 * @route   PUT /api/couples/settings
 * @desc    Update couple settings
 * @access  Private
 * @body    { settings: { allowLocationShare?: boolean, theme?: string } }
 */
router.put(
  "/settings",
  validateUpdateCoupleSettings,
  coupleController.updateSettings
);

/**
 * @route   PUT /api/couples/anniversary
 * @desc    Update anniversary date
 * @access  Private
 * @body    { anniversaryDate: string }
 */
router.put(
  "/anniversary",
  validateUpdateAnniversaryDate,
  coupleController.updateAnniversaryDate
);

/**
 * @route   POST /api/couples/regenerate-invite
 * @desc    Regenerate invite code
 * @access  Private
 */
router.post("/regenerate-invite", coupleController.regenerateInviteCode);

/**
 * @route   DELETE /api/couples/leave
 * @desc    Leave current couple
 * @access  Private
 */
router.delete("/leave", coupleController.leaveCouple);

/**
 * @route   GET /api/couples/:id
 * @desc    Get couple by ID (for couple members only)
 * @access  Private
 */
router.get("/:id", coupleController.getCoupleById);

/**
 * @route   DELETE /api/couples/:id
 * @desc    Delete couple (for couple members)
 * @access  Private
 */
router.delete("/:id", coupleController.deleteCouple);

// ===========================================
// ADMIN ROUTES
// ===========================================

/**
 * @route   GET /api/couples/admin/stats
 * @desc    Get invitation statistics (Admin only)
 * @access  Private (Admin)
 */
router.get(
  "/admin/invitations/stats",
  restrictTo("admin"),
  invitationController.getInvitationStats
);

/**
 * @route   GET /api/couples
 * @desc    Get all couples (Admin only)
 * @access  Private (Admin)
 * @query   ?page=1&limit=10
 */
router.get("/", restrictTo("admin"), coupleController.getAllCouples);

export { router as coupleRoutes };
