const mongoose = require("mongoose");

const Workspace = require("../models/Workspace");
const WorkspaceMember = require("../models/WorkspaceMember");
const WorkspaceInvitation = require("../models/WorkspaceInvitation");
const User = require("../models/User");

const {generateInvitationToken,hashInvitationToken} = require("../utils/invitationTokens");

const INVITATION_VALIDITY_DAYS = 7;

const formatInvitation = (invitation) => ({
  _id: invitation._id,
  workspaceId: invitation.workspaceId,
  invitedEmail: invitation.invitedEmail,
  invitedBy: invitation.invitedBy,
  role: invitation.role,
  status: invitation.status,
  expiresAt: invitation.expiresAt,
  acceptedBy: invitation.acceptedBy,
  acceptedAt: invitation.acceptedAt,
  createdAt: invitation.createdAt,
  updatedAt: invitation.updatedAt,
});

const createWorkspaceInvitation = async ({workspaceId,invitedEmail,invitedBy,}) => {
  const email = String(invitedEmail || "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { status: "invalid_email" };
  }

  const workspace = await Workspace.findById(workspaceId)
    .select("_id name slug");

  if (!workspace) {
    return { status: "workspace_not_found" };
  }

  const existingUser = await User.findOne({
    email,
  }).select("_id");

  if (existingUser) {
    const existingMembership = await WorkspaceMember.findOne({
      workspaceId,
      userId: existingUser._id,
    });

    if (existingMembership) {
      return { status: "already_member" };
    }
  }

  const now = new Date();

  await WorkspaceInvitation.updateMany(
    {
      workspaceId,
      invitedEmail: email,
      status: "pending",
      expiresAt: { $lte: now },
    },
    {
      $set: { status: "expired" },
    }
  );

  const existingInvitation = await WorkspaceInvitation.findOne({
    workspaceId,
    invitedEmail: email,
    status: "pending",
    expiresAt: { $gt: now },
  });

  if (existingInvitation) {
    return {
      status: "pending_exists",
      invitation: formatInvitation(existingInvitation),
    };
  }

  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(
    now.getTime() +
      INVITATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000
  );

  const invitation = new WorkspaceInvitation({
    workspaceId,
    invitedEmail: email,
    invitedBy,
    role: "member",
    tokenHash,
    expiresAt,
  });

  try {
    await invitation.save();

    return {
      status: "created",
      invitation: formatInvitation(invitation),
      token,
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
      },
    };
  } catch (error) {
    
    
    if (error.code === 11000) {
      return { status: "pending_exists" };
    }

    throw error;
  }
};

const acceptWorkspaceInvitation = async (token, userId) => {
  if (typeof token !== "string" || !token.trim()) {
    return { status: "invalid_token" };
  }
  const tokenHash = hashInvitationToken(token.trim());  
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      result = undefined;
      const now = new Date();

      const invitation = await WorkspaceInvitation.findOne({
        tokenHash,
      }).session(session);

      if (!invitation) {
        result = { status: "invalid_token" };
        return;
      }

      if (invitation.status !== "pending") {
        result = {
          status:
            invitation.status === "expired"
              ? "expired"
              : invitation.status === "revoked"
                ? "revoked"
                : "already_used",
        };
        return;
      }

      if (invitation.expiresAt <= now) {
        invitation.status = "expired";
        await invitation.save({ session });

        result = { status: "expired" };
        return;
      }

      const user = await User.findById(userId)
        .select("_id username email avatarUrl")
        .session(session);

      if (!user) {
        result = { status: "user_not_found" };
        return;
      }

      const userEmail = user.email.trim().toLowerCase();

      if (userEmail !== invitation.invitedEmail) {
        result = { status: "email_mismatch" };
        return;
      }

      const workspace = await Workspace.findById(
        invitation.workspaceId
      )
        .select("_id name slug")
        .session(session);

      if (!workspace) {
        result = { status: "workspace_not_found" };
        return;
      }

      const existingMembership = await WorkspaceMember.findOne({
        workspaceId: invitation.workspaceId,
        userId: user._id,
      }).session(session);

      if (existingMembership) {
        invitation.status = "accepted";
        invitation.acceptedBy = user._id;
        invitation.acceptedAt = now;
        await invitation.save({ session });
        result = {
          status: "already_member",
          workspace: {
            _id: workspace._id,
            name: workspace.name,
            slug: workspace.slug,
          },
        };
        return;
      }

      const membership = new WorkspaceMember({
        workspaceId: invitation.workspaceId,
        userId: user._id,
        role: "member",
      });

      await membership.save({ session });
      invitation.status = "accepted";
      invitation.acceptedBy = user._id;
      invitation.acceptedAt = now;

      await invitation.save({ session });

      result = {
        status: "accepted",
        workspace: {
          _id: workspace._id,
          name: workspace.name,
          slug: workspace.slug,
        },
        member: {
          userId: user._id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: membership.role,
          joinedAt: membership.createdAt,
        },
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
};

const listWorkspaceInvitations = async (workspaceId) => {
  const now = new Date();

  await WorkspaceInvitation.updateMany(
    {
      workspaceId,
      status: "pending",
      expiresAt: { $lte: now },
    },
    {
      $set: { status: "expired" },
    }
  );

  const invitations = await WorkspaceInvitation.find({
    workspaceId,
  })
    .populate({
      path: "invitedBy",
      select: "username email",
    })
    .sort({ createdAt: -1 });

  return invitations.map(formatInvitation);
};


const revokeWorkspaceInvitation = async (workspaceId,invitationId) => {
  const invitation = await WorkspaceInvitation.findOne({
    _id: invitationId,
    workspaceId,
  });

  if (!invitation) {
    return { status: "not_found" };
  }

  if (invitation.status !== "pending") {
    return {
      status:
        invitation.status === "expired"
          ? "expired"
          : "not_pending",
    };
  }

  if (invitation.expiresAt <= new Date()) {
    invitation.status = "expired";
    await invitation.save();

    return { status: "expired" };
  }

  invitation.status = "revoked";
  await invitation.save();

  return {
    status: "revoked",
    invitation: formatInvitation(invitation),
  };
};

const getWorkspaceInvitationDetails = async (token) => {
  if (typeof token !== "string" || !token.trim()) {
    return { status: "invalid_token" };
  }
  const tokenHash = hashInvitationToken(token.trim());
  const invitation = await WorkspaceInvitation.findOne({tokenHash});

  if (!invitation) {
    return { status: "invalid_token" };
  }

  if (invitation.status !== "pending") {
    if (invitation.status === "expired") {
      return { status: "expired" };
    }

    if (invitation.status === "revoked") {
      return { status: "revoked" };
    }

    return { status: "already_used" };
  }

  if (invitation.expiresAt <= new Date()) {
    invitation.status = "expired";
    await invitation.save();

    return { status: "expired" };
  }

  const workspace = await Workspace.findById(
    invitation.workspaceId
  ).select("_id name slug");

  if (!workspace) {
    return { status: "workspace_not_found" };
  }

  return {
    status: "pending",
    invitation: {
      invitedEmail: invitation.invitedEmail,
      expiresAt: invitation.expiresAt,
    },
    workspace: {
      _id: workspace._id,
      name: workspace.name,
      slug: workspace.slug,
    },
  };
};

module.exports = {createWorkspaceInvitation,acceptWorkspaceInvitation,listWorkspaceInvitations,revokeWorkspaceInvitation,getWorkspaceInvitationDetails};