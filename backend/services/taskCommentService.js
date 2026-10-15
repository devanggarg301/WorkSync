const Project = require("../models/Project");
const Task = require("../models/Task");
const TaskComment = require("../models/TaskComment");
const {recordTaskActivity} = require("./taskActivityService");
const WorkspaceMember = require("../models/WorkspaceMember");

const getTaskComments = async (workspaceId,projectId,taskId) => {
  const project = await Project.findOne({
    _id: projectId,
    workspaceId,
  }).select("_id");

  if (!project) {
    return { status: "project_not_found" };
  }

  const task = await Task.findOne({
    _id: taskId,
    workspaceId,
    projectId,
  }).select("_id");

  if (!task) {
    return { status: "task_not_found" };
  }

  const comments = await TaskComment.find({
    workspaceId,
    projectId,
    taskId,
  })
    .populate({
      path: "authorId",
      select: "username avatarUrl",
    })
    .sort({ createdAt: 1 });

  return {
    status: "success",
    comments,
  };
};

const createTaskComment = async (body,workspaceId,projectId,taskId,userId) => {
  const project = await Project.findOne({
    _id: projectId,
    workspaceId,
  }).select("_id");

  if (!project) {
    return { status: "project_not_found" };
  }

  const task = await Task.findOne({
    _id: taskId,
    workspaceId,
    projectId,
  }).select("_id");

  if (!task) {
    return { status: "task_not_found" };
  }

  const comment = await TaskComment.create({
    workspaceId,
    projectId,
    taskId,
    authorId: userId,
    body,
  });

  await comment.populate({
    path: "authorId",
    select: "username avatarUrl",
  });
  await recordTaskActivity({
  workspaceId,
  projectId,
  taskId,
  actorId: userId,
  action: "comment_added",
  message: "added a comment",
  metadata: {
    commentId: comment._id,
  },
});

  return {
    status: "created",
    comment,
  };
};

const updateTaskComment = async (body,workspaceId,projectId,taskId,commentId,userId) => {
  const project = await Project.findOne({
    _id: projectId,
    workspaceId,
  }).select("_id");

  if (!project) {
    return { status: "project_not_found" };
  }

  const task = await Task.findOne({
    _id: taskId,
    workspaceId,
    projectId,
  }).select("_id");

  if (!task) {
    return { status: "task_not_found" };
  }

  const comment = await TaskComment.findOne({
    _id: commentId,
    workspaceId,
    projectId,
    taskId,
  });

  if (!comment) {
    return { status: "comment_not_found" };
  }

  if (comment.authorId.toString() !== userId.toString()) {
    return { status: "forbidden" };
  }

  comment.body = body;
  await comment.save();

  await comment.populate({
    path: "authorId",
    select: "username avatarUrl",
  });

  await recordTaskActivity({
    workspaceId,
    projectId,
    taskId,
    actorId: userId,
    action: "comment_edited",
    message: "edited a comment",
    metadata: {
      commentId: comment._id,
    },
  });

  return {
    status: "success",
    comment,
  };
};

const deleteTaskComment = async (workspaceId,projectId,taskId,commentId,userId) => {
  const project = await Project.findOne({
    _id: projectId,
    workspaceId,
  }).select("_id");

  if (!project) {
    return { status: "project_not_found" };
  }

  const task = await Task.findOne({
    _id: taskId,
    workspaceId,
    projectId,
  }).select("_id");

  if (!task) {
    return { status: "task_not_found" };
  }

  const comment = await TaskComment.findOne({
    _id: commentId,
    workspaceId,
    projectId,
    taskId,
  });

  if (!comment) {
    return { status: "comment_not_found" };
  }

  const member = await WorkspaceMember.findOne({
    workspaceId,
    userId,
  }).select("role");

  const isAuthor =
    comment.authorId.toString() === userId.toString();

  const canManageComments =
    ["owner", "admin"].includes(member?.role);

  if (!isAuthor && !canManageComments) {
    return { status: "forbidden" };
  }

  await comment.deleteOne();

  await recordTaskActivity({
    workspaceId,
    projectId,
    taskId,
    actorId: userId,
    action: "comment_deleted",
    message: "deleted a comment",
    metadata: {
      commentId: comment._id,
    },
  });

  return { status: "deleted" };
};

module.exports = {getTaskComments,createTaskComment,updateTaskComment,deleteTaskComment};