const Project = require("../models/Project");
const Task = require("../models/Task");
const TaskComment = require("../models/TaskComment");
const {recordTaskActivity} = require("./taskActivityService");

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

module.exports = {getTaskComments,createTaskComment};