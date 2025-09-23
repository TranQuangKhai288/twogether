import { Request, Response } from "express";
import { ApiResponse } from "../types/index";
import { AppError } from "../utils/AppError";
import { CoupleInvitationService } from "../database/services/CoupleInvitationService";
import { asyncHandler } from "../utils/asyncHandler";

export class CoupleInvitationController {
  private invitationService: CoupleInvitationService;

  constructor() {
    this.invitationService = new CoupleInvitationService();
  }

  /**
   * Handle invitation action (accept/reject/cancel)
   */
  public handleInvitationAction = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = req.user!._id;
        const { id } = req.params;
        const { action } = req.body;

        // Validate action
        if (!action || !["accept", "reject", "cancel"].includes(action)) {
          throw new AppError(
            'Invalid action. Must be "accept", "reject", or "cancel"',
            400
          );
        }

        let result;
        let message: string;

        switch (action) {
          case "accept":
            result = await this.invitationService.acceptInvitation(
              id,
              userId.toString()
            );
            message = "Invitation accepted successfully! Couple created.";
            break;
          case "reject":
            result = await this.invitationService.rejectInvitation(
              id,
              userId.toString()
            );
            message = "Invitation rejected successfully";
            break;
          case "cancel":
            result = await this.invitationService.cancelInvitation(
              id,
              userId.toString()
            );
            message = "Invitation cancelled successfully";
            break;
          default:
            throw new AppError("Invalid action", 400);
        }

        const response: ApiResponse = {
          success: true,
          message,
          data: result,
          timestamp: new Date().toISOString(),
        };

        res.status(200).json(response);
      } catch (error) {
        throw new AppError(
          "An error occurred while processing the invitation action",
          500
        );
      }
    }
  );

  /**
   * Send couple invitation
   */
  public sendInvitation = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;
      const { receiverEmail, anniversaryDate, message } = req.body;

      if (!receiverEmail || !anniversaryDate) {
        throw new AppError(
          "Receiver email and anniversary date are required",
          400
        );
      }

      const invitation = await this.invitationService.sendInvitation(
        userId.toString(),
        receiverEmail,
        new Date(anniversaryDate),
        message
      );

      const response: ApiResponse = {
        success: true,
        message: "Couple invitation sent successfully",
        data: {
          id: invitation._id,
          sender: invitation.sender,
          receiver: invitation.receiver,
          anniversaryDate: invitation.anniversaryDate,
          message: invitation.message,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    }
  );

  /**
   * Get user's received invitations
   */
  public getMyInvitations = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;

      const invitations = await this.invitationService.getUserInvitations(
        userId.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: "Invitations retrieved successfully",
        data: invitations.map((invitation) => ({
          id: invitation._id,
          sender: invitation.sender,
          anniversaryDate: invitation.anniversaryDate,
          message: invitation.message,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        })),
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get user's sent invitations
   */
  public getMySentInvitations = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;

      const invitations = await this.invitationService.getSentInvitations(
        userId.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: "Sent invitations retrieved successfully",
        data: invitations.map((invitation) => ({
          id: invitation._id,
          receiver: invitation.receiver,
          anniversaryDate: invitation.anniversaryDate,
          message: invitation.message,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        })),
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Accept couple invitation
   */
  public acceptInvitation = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;
      const { id } = req.params;

      const couple = await this.invitationService.acceptInvitation(
        id,
        userId.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: "Invitation accepted successfully! Couple created.",
        data: {
          id: couple._id,
          users: couple.users,
          anniversaryDate: couple.anniversaryDate,
          inviteCode: couple.inviteCode,
          status: couple.status,
          settings: couple.settings,
          createdAt: couple.createdAt,
          updatedAt: couple.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Reject couple invitation
   */
  public rejectInvitation = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;
      const { id } = req.params;

      await this.invitationService.rejectInvitation(id, userId.toString());

      const response: ApiResponse = {
        success: true,
        message: "Invitation rejected successfully",
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Cancel sent invitation
   */
  public cancelInvitation = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id;
      const { id } = req.params;

      await this.invitationService.cancelInvitation(id, userId.toString());

      const response: ApiResponse = {
        success: true,
        message: "Invitation cancelled successfully",
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get invitation by ID
   */
  public getInvitationById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = req.user!._id;

      const invitation = await this.invitationService.getInvitationById(id);

      if (!invitation) {
        throw new AppError("Invitation not found", 404);
      }

      // Check if user is involved in this invitation
      const isInvolved =
        invitation.sender._id.equals(userId) ||
        invitation.receiver._id.equals(userId);
      if (!isInvolved) {
        throw new AppError(
          "You are not authorized to view this invitation",
          403
        );
      }

      const response: ApiResponse = {
        success: true,
        message: "Invitation retrieved successfully",
        data: {
          id: invitation._id,
          sender: invitation.sender,
          receiver: invitation.receiver,
          anniversaryDate: invitation.anniversaryDate,
          message: invitation.message,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
          updatedAt: invitation.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );

  /**
   * Get invitation statistics (Admin only)
   */
  public getInvitationStats = asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      const stats = await this.invitationService.getInvitationStats();

      const response: ApiResponse = {
        success: true,
        message: "Invitation statistics retrieved successfully",
        data: stats,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    }
  );
}
