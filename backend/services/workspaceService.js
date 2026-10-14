const mongoose = require("mongoose");
const Workspace = require("../models/Workspace");
const WorkspaceMember = require("../models/WorkspaceMember");
const User = require("../models/User");


const createWorkspace = async ({ name, description }, userId) => {
  const session = await mongoose.startSession();

  let createdWorkspace;

  try {
    await session.withTransaction(async () => {
      const workspace = new Workspace({
        name,
        description,
        slug: name.toLowerCase().trim().replace(/\s+/g, "-"),
        createdBy: userId,
      });

      await workspace.save({ session });


      const membership = new WorkspaceMember({
        workspaceId: workspace._id,
        userId,
        role: "owner",
      });

      await membership.save({ session });

      createdWorkspace = workspace;
    });

    return createdWorkspace;
  } finally {
    await session.endSession();
  }
};


const getUserWorkspaces = async (userId) => {
  const memberships = await WorkspaceMember.find({
    userId,
  }).populate({
    path: "workspaceId",
    select: "name description slug createdBy",
  });

  return memberships
    .filter((membership) => membership.workspaceId)
    .map((membership) => {
      const workspace = membership.workspaceId;

      return {
        _id: workspace._id,
        name: workspace.name,
        description: workspace.description,
        slug: workspace.slug,
        createdBy: workspace.createdBy,
        role: membership.role,
      };
    });
};

const getWorkspaceById = async (workspaceId) => {
  return Workspace.findById(workspaceId).select(
    "name description slug createdBy createdAt updatedAt"
  );
};

const updateWorkspaceById = async (workspaceId, updates) => {
  return Workspace.findByIdAndUpdate(
    workspaceId,
    updates,
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).select("name description slug createdBy createdAt updatedAt");
};

const changeWorkspaceMemberRole = async (
  workspaceId,
  targetUserId,
  newRole
) => {
  const membership = await WorkspaceMember.findOneAndUpdate(
    {
      workspaceId,
      userId: targetUserId,
      role: { $in: ["admin", "member"] },
    },
    {
      $set: { role: newRole },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (membership) {
    return {
      status: "updated",
      membership,
    };
  }

  const existingMembership = await WorkspaceMember.findOne({
    workspaceId,
    userId: targetUserId,
  }).select("role");

  if (!existingMembership) {
    return {
      status: "not_found",
    };
  }

  return {
    status: "owner_protected",
  };
};


const getWorkspaceMembers = async (workspaceId) => {
  const memberships = await WorkspaceMember.find({
    workspaceId,
  })
    .select("userId role createdAt")
    .populate({
      path: "userId",
      select: "username email avatarUrl",
    })
    .sort({ createdAt: 1 });

  return memberships
    .filter((membership) => membership.userId)
    .map((membership) => ({
      userId: membership.userId._id,
      username: membership.userId.username,
      email: membership.userId.email,
      avatarUrl: membership.userId.avatarUrl,
      role: membership.role,
      joinedAt: membership.createdAt,
    }));
};


const addWorkspaceMember = async (workspaceId, email) => {
  const user = await User.findOne({ email }).select(
    "_id username email avatarUrl"
  );

  if (!user) {
    return { status: "user_not_found" };
  }

  const existingMembership = await WorkspaceMember.findOne({
    workspaceId,
    userId: user._id,
  });

  if (existingMembership) {
    return { status: "already_member" };
  }

  try {
    const membership = await WorkspaceMember.create({
      workspaceId,
      userId: user._id,
      role: "member",
    });

    return {
      status: "added",
      member: {
        userId: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: membership.role,
        joinedAt: membership.createdAt,
      },
    };
  } catch (error) {
    if (error.code === 11000) {
      return { status: "already_member" };
    }
    throw error;
  }
};


const removeWorkspaceMember = async (workspaceId,targetUserId,requesterRole,requesterId) => {
  if (requesterId.toString() === targetUserId.toString()) {
    return { status: "self_removal" };
  }

  const targetMembership = await WorkspaceMember.findOne({
    workspaceId,
    userId: targetUserId,
  }).select("_id role");

  if (!targetMembership) {
    return { status: "not_found" };
  }

  if (targetMembership.role === "owner") {
    return { status: "owner_protected" };
  }

  if (
    requesterRole === "admin" &&
    targetMembership.role !== "member"
  ) {
    return { status: "insufficient_permissions" };
  }

  const deletedMembership = await WorkspaceMember.findOneAndDelete({
    _id: targetMembership._id,
    role: targetMembership.role,
  });

  if (!deletedMembership) {
    return { status: "membership_changed" };
  }

  return { status: "removed" };
}

module.exports = {createWorkspace,getUserWorkspaces,getWorkspaceById,updateWorkspaceById,changeWorkspaceMemberRole,getWorkspaceMembers,addWorkspaceMember,removeWorkspaceMember };