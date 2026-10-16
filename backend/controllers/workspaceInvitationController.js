const {
  createWorkspaceInvitation,
  acceptWorkspaceInvitation,
  listWorkspaceInvitations,
  revokeWorkspaceInvitation,
} = require("../services/workspaceInvitationService");

const createInvitation = async (req, res) => {
  try {
    const result = await createWorkspaceInvitation({
      workspaceId: req.params.workspaceId,
      invitedEmail: req.body.email,
      invitedBy: req.user._id,
    });

    if (result.status === "invalid_email") {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required",
      });
    }

    if (result.status === "workspace_not_found") {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    if (result.status === "already_member") {
      return res.status(409).json({
        success: false,
        message: "This user is already a workspace member",
      });
    }

    if (result.status === "pending_exists") {
      return res.status(409).json({
        success: false,
        message: "A pending invitation already exists for this email",
        invitation: result.invitation || undefined,
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Invitation record created. Email delivery will be connected next.",
      invitation: result.invitation,
    });
  } catch (error) {
    console.error("Create workspace invitation error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const listInvitations = async (req, res) => {
  try {
    const invitations = await listWorkspaceInvitations(
      req.params.workspaceId
    );

    return res.status(200).json({
      success: true,
      invitations,
    });
  } catch (error) {
    console.error("List workspace invitations error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const revokeInvitation = async (req, res) => {
  try {
    const result = await revokeWorkspaceInvitation(
      req.params.workspaceId,
      req.params.invitationId
    );

    if (result.status === "not_found") {
      return res.status(404).json({
        success: false,
        message: "Invitation not found",
      });
    }

    if (result.status === "expired") {
      return res.status(410).json({
        success: false,
        message: "This invitation has expired",
      });
    }

    if (result.status === "not_pending") {
      return res.status(409).json({
        success: false,
        message: "Only pending invitations can be revoked",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invitation revoked successfully",
      invitation: result.invitation,
    });
  } catch (error) {
    console.error("Revoke workspace invitation error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const acceptInvitation = async (req, res) => {
  try {
    const result = await acceptWorkspaceInvitation(
      req.params.token,
      req.user._id
    );

    if (result.status === "invalid_token") {
      return res.status(404).json({
        success: false,
        message: "Invitation link is invalid or unavailable",
      });
    }

    if (result.status === "expired") {
      return res.status(410).json({
        success: false,
        message: "This invitation has expired",
      });
    }

    if (result.status === "revoked") {
      return res.status(410).json({
        success: false,
        message: "This invitation has been revoked",
      });
    }

    if (result.status === "already_used") {
      return res.status(409).json({
        success: false,
        message: "This invitation has already been used",
      });
    }

    if (result.status === "email_mismatch") {
      return res.status(403).json({
        success: false,
        message: "This invitation belongs to a different email address",
      });
    }

    if (result.status === "user_not_found") {
      return res.status(404).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    if (result.status === "workspace_not_found") {
      return res.status(404).json({
        success: false,
        message: "The invited workspace no longer exists",
      });
    }

    if (result.status === "already_member") {
      return res.status(409).json({
        success: false,
        message: "You are already a member of this workspace",
        workspace: result.workspace,
      });
    }

    return res.status(200).json({
      success: true,
      message: "You have joined the workspace successfully",
      workspace: result.workspace,
      member: result.member,
    });
  } catch (error) {
    console.error("Accept workspace invitation error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


module.exports = {createInvitation,listInvitations,revokeInvitation,acceptInvitation,};