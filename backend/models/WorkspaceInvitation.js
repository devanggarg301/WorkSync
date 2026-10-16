const mongoose = require("mongoose");

const workspaceInvitationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    invitedEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["member"],
      default: "member",
      required: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "revoked", "expired"],
      default: "pending",
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


workspaceInvitationSchema.index({
  workspaceId: 1,
  status: 1,
  createdAt: -1,
});


workspaceInvitationSchema.index({
  workspaceId: 1,
  invitedEmail: 1,
  status: 1,
});



workspaceInvitationSchema.index(
  {
    workspaceId: 1,
    invitedEmail: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "pending",
    },
    name: "one_pending_invitation_per_workspace_email",
  }
);

const WorkspaceInvitation = mongoose.model("WorkspaceInvitation",workspaceInvitationSchema);

module.exports = WorkspaceInvitation;