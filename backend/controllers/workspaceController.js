const mongoose = require("mongoose");
const { createWorkspace,getUserWorkspaces,getWorkspaceById,updateWorkspaceById,changeWorkspaceMemberRole,getWorkspaceMembers,addWorkspaceMember,removeWorkspaceMember } = require("../services/workspaceService");

const create = async (req, res) => {
  try {
    const workspace = await createWorkspace(
      req.body,
      req.user._id
    );

    return res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      workspace,
    });
  } catch (error) {
    console.error("Create workspace error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getMyWorkspaces  = async (req, res) => {
  try {
    const workspaces = await getUserWorkspaces(req.user._id);

    return res.status(200).json({
      success: true,
      workspaces,
    });
  } catch (error) {
    console.error("Get workspaces error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getWorkspace = async (req, res) => {
  try {
    const workspace = await getWorkspaceById(
      req.params.workspaceId
    );

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    return res.status(200).json({
      success: true,
      workspace: {
        ...workspace.toObject(),
        role: req.workspaceMembership.role,
      },
    });
  } catch (error) {
    console.error("Get workspace error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateWorkspaceDetails = async (req, res) => {
  try {
    const workspace = await updateWorkspaceById(req.params.workspaceId,req.body);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Workspace updated successfully",
      workspace: {
        ...workspace.toObject(),
        role: req.workspaceMembership.role,
      },
    });
  } catch (error) {
    console.error("Update workspace error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateWorkspaceMemberRole = async (req, res) => {
  const { workspaceId, userId } = req.params;
  const { role } = req.body;

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  try {
    const result = await changeWorkspaceMemberRole(
      workspaceId,
      userId,
      role
    );

    if (result.status === "not_found") {
      return res.status(404).json({
        success: false,
        message: "Workspace member not found",
      });
    }

    if (result.status === "owner_protected") {
      return res.status(403).json({
        success: false,
        message: "The owner's role cannot be changed here",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Workspace member role updated successfully",
      membership: {
        workspaceId: result.membership.workspaceId,
        userId: result.membership.userId,
        role: result.membership.role,
      },
    });
  } catch (error) {
    console.error("Update workspace member role error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const listWorkspaceMembers = async (req, res) => {
  try {
    const members = await getWorkspaceMembers(
      req.params.workspaceId
    );

    return res.status(200).json({
      success: true,
      members,
    });
  } catch (error) {
    console.error("List workspace members error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const addMember = async (req, res) => {
  try {
    const result = await addWorkspaceMember(
      req.params.workspaceId,
      req.body.email
    );

    if (result.status === "user_not_found") {
      return res.status(404).json({
        success: false,
        message: "No registered user found with this email",
      });
    }

    if (result.status === "already_member") {
      return res.status(409).json({
        success: false,
        message: "User is already a member of this workspace",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Member added successfully",
      member: result.member,
    });
  } catch (error) {
    console.error("Add workspace member error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const removeMember = async (req, res) => {
  const { workspaceId, userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  try {
    const result = await removeWorkspaceMember(
      workspaceId,
      userId,
      req.workspaceMembership.role,
      req.user._id
    );

    if (result.status === "not_found") {
      return res.status(404).json({
        success: false,
        message: "Workspace member not found",
      });
    }

    if (result.status === "owner_protected") {
      return res.status(403).json({
        success: false,
        message: "The workspace owner cannot be removed",
      });
    }

    if (result.status === "self_removal") {
      return res.status(400).json({
        success: false,
        message: "You cannot remove yourself through this endpoint",
      });
    }

    if (result.status === "insufficient_permissions") {
      return res.status(403).json({
        success: false,
        message: "You cannot remove a member with this role",
      });
    }

    if (result.status === "membership_changed") {
      return res.status(409).json({
        success: false,
        message: "Membership changed during the request. Please retry.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Workspace member removed successfully",
    });
  } catch (error) {
    console.error("Remove workspace member error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


module.exports = {create,getMyWorkspaces,getWorkspace,updateWorkspaceDetails,updateWorkspaceMemberRole,listWorkspaceMembers,addMember,removeMember };