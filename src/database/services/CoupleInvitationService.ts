import { Types } from "mongoose";
import {
  CoupleInvitation,
  ICoupleInvitation,
} from "../models/CoupleInvitation.js";
import { Couple, ICouple } from "../models/Couple.js";
import { AppError } from "../../utils/AppError.js";
import { UserService } from "./UserService.js";

export class CoupleInvitationService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Send couple invitation
   */
  async sendInvitation(
    senderId: string | Types.ObjectId,
    receiverEmail: string,
    anniversaryDate: Date,
    message?: string
  ): Promise<ICoupleInvitation> {
    try {
      // Cleanup expired invitations first
      await CoupleInvitation.cleanupExpired();

      // Find sender
      const sender = await this.userService.findById(senderId.toString());
      if (!sender) {
        throw new AppError("Sender not found", 404);
      }

      // Find receiver by email
      const receiver = await this.userService.findByEmail(receiverEmail);
      if (!receiver) {
        throw new AppError("User with this email not found", 404);
      }

      // Check if sender is already in a couple
      if (sender.coupleId) {
        throw new AppError("You are already in a couple", 400);
      }

      // Check if receiver is already in a couple
      if (receiver.coupleId) {
        throw new AppError("This person is already in a couple", 400);
      }

      // Check if there's already a pending invitation between these users
      const existingInvitation = await CoupleInvitation.findOne({
        $or: [
          { sender: sender._id, receiver: receiver._id, status: "pending" },
          { sender: receiver._id, receiver: sender._id, status: "pending" },
        ],
      });

      if (existingInvitation) {
        throw new AppError(
          "There is already a pending invitation between you two",
          400
        );
      }

      // Create invitation
      const invitation = new CoupleInvitation({
        sender: sender._id,
        receiver: receiver._id,
        anniversaryDate,
        message: message?.trim(),
      });

      await invitation.save();

      return await invitation.populate([
        { path: "sender", select: "name email avatarUrl" },
        { path: "receiver", select: "name email avatarUrl" },
      ]);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to send couple invitation", 500);
    }
  }

  /**
   * Get user's pending invitations (received)
   */
  async getUserInvitations(
    userId: string | Types.ObjectId
  ): Promise<ICoupleInvitation[]> {
    try {
      // Cleanup expired invitations first
      await CoupleInvitation.cleanupExpired();

      return await CoupleInvitation.find({
        receiver: userId,
        status: "pending",
      })
        .populate("sender", "name email avatarUrl")
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new AppError("Failed to get invitations", 500);
    }
  }

  /**
   * Get user's sent invitations
   */
  async getSentInvitations(
    userId: string | Types.ObjectId
  ): Promise<ICoupleInvitation[]> {
    try {
      // Cleanup expired invitations first
      await CoupleInvitation.cleanupExpired();

      return await CoupleInvitation.find({
        sender: userId,
        status: "pending",
      })
        .populate("receiver", "name email avatarUrl")
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new AppError("Failed to get sent invitations", 500);
    }
  }

  /**
   * Accept couple invitation
   */
  async acceptInvitation(
    invitationId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<ICouple> {
    try {
      const invitation = await CoupleInvitation.findById(invitationId)
        .populate("sender")
        .populate("receiver");
      if (!invitation) {
        throw new AppError("Invitation not found", 404);
      }

      // Check if user is the receiver
      if (!invitation.receiver._id.equals(userId)) {
        throw new AppError(
          "You are not authorized to accept this invitation",
          403
        );
      }

      // Check if invitation is still pending
      if (invitation.status !== "pending") {
        throw new AppError("This invitation is no longer valid", 400);
      }

      // Check if invitation is expired
      if (invitation.isExpired()) {
        invitation.status = "expired";
        await invitation.save();
        throw new AppError("This invitation has expired", 400);
      }

      // Check if either user is already in a couple
      const sender = await this.userService.findById(
        invitation.sender._id.toString()
      );
      const receiver = await this.userService.findById(
        invitation.receiver._id.toString()
      );

      if (sender?.coupleId) {
        throw new AppError("The sender is already in a couple", 400);
      }

      if (receiver?.coupleId) {
        throw new AppError("You are already in a couple", 400);
      }

      // Generate unique invite code for the couple
      let inviteCode = this.generateInviteCode();
      while (await Couple.findOne({ inviteCode })) {
        inviteCode = this.generateInviteCode();
      }

      // Create couple
      const couple = new Couple({
        users: [invitation.sender._id, invitation.receiver._id],
        anniversaryDate: invitation.anniversaryDate,
        inviteCode,
        status: "active",
        settings: {
          allowLocationShare: false,
          theme: "light",
        },
      });

      await couple.save();

      // Update both users' coupleId
      await Promise.all([
        this.userService.setUserCouple(invitation.sender._id, couple._id),
        this.userService.setUserCouple(invitation.receiver._id, couple._id),
      ]);

      // Update invitation status
      invitation.status = "accepted";
      await invitation.save();

      // Cancel all other pending invitations for both users
      await CoupleInvitation.updateMany(
        {
          $or: [
            {
              sender: { $in: [invitation.sender._id, invitation.receiver._id] },
            },
            {
              receiver: {
                $in: [invitation.sender._id, invitation.receiver._id],
              },
            },
          ],
          status: "pending",
          _id: { $ne: invitation._id },
        },
        { $set: { status: "expired" } }
      );

      return await couple.populate("users", "-passwordHash");
    } catch (error: any) {
      throw new AppError(error.errors.message as string, 500);
    }
  }

  /**
   * Reject couple invitation
   */
  async rejectInvitation(
    invitationId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<void> {
    try {
      const invitation = await CoupleInvitation.findById(invitationId);

      if (!invitation) {
        throw new AppError("Invitation not found", 404);
      }

      // Check if user is the receiver
      if (!invitation.receiver.equals(userId)) {
        throw new AppError(
          "You are not authorized to reject this invitation",
          403
        );
      }

      // Check if invitation is still pending
      if (invitation.status !== "pending") {
        throw new AppError("This invitation is no longer valid", 400);
      }

      // Update invitation status
      invitation.status = "rejected";
      await invitation.save();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to reject invitation", 500);
    }
  }

  /**
   * Cancel sent invitation
   */
  async cancelInvitation(
    invitationId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<void> {
    try {
      const invitation = await CoupleInvitation.findById(invitationId);

      if (!invitation) {
        throw new AppError("Invitation not found", 404);
      }

      // Check if user is the sender
      if (!invitation.sender.equals(userId)) {
        throw new AppError(
          "You are not authorized to cancel this invitation",
          403
        );
      }

      // Check if invitation is still pending
      if (invitation.status !== "pending") {
        throw new AppError("This invitation cannot be cancelled", 400);
      }

      // Update invitation status to expired (cancelled)
      invitation.status = "expired";
      await invitation.save();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to cancel invitation", 500);
    }
  }

  /**
   * Get invitation by ID
   */
  async getInvitationById(
    invitationId: string | Types.ObjectId
  ): Promise<ICoupleInvitation | null> {
    try {
      return await CoupleInvitation.findById(invitationId)
        .populate("sender", "name email avatarUrl")
        .populate("receiver", "name email avatarUrl");
    } catch (error) {
      throw new AppError("Failed to get invitation", 500);
    }
  }

  /**
   * Generate a unique invite code
   */
  private generateInviteCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get invitation statistics for admin
   */
  async getInvitationStats(): Promise<{
    totalPending: number;
    totalAccepted: number;
    totalRejected: number;
    totalExpired: number;
  }> {
    try {
      const [pending, accepted, rejected, expired] = await Promise.all([
        CoupleInvitation.countDocuments({ status: "pending" }),
        CoupleInvitation.countDocuments({ status: "accepted" }),
        CoupleInvitation.countDocuments({ status: "rejected" }),
        CoupleInvitation.countDocuments({ status: "expired" }),
      ]);

      return {
        totalPending: pending,
        totalAccepted: accepted,
        totalRejected: rejected,
        totalExpired: expired,
      };
    } catch (error) {
      throw new AppError("Failed to get invitation statistics", 500);
    }
  }
}
