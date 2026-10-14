
const Project = require("../models/Project");
const Task = require("../models/Task");
const TaskActivity = require("../models/TaskActivity");

const recordTaskActivity = async ({workspaceId,projectId,taskId,actorId,action,message,metadata = {},}) => {
  try {
    await TaskActivity.create({
      workspaceId,
      projectId,
      taskId,
      actorId,
      action,
      message,
      metadata,
    });
  } catch (error) {
    console.error("Failed to record task activity:", error);
  }
};

const getTaskActivityForTask = async (workspaceId,projectId,taskId) => {
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

  const activities = await TaskActivity.find({
    workspaceId,
    projectId,
    taskId,
  })
    .populate({
      path: "actorId",
      select: "username avatarUrl",
    })
    .sort({ createdAt: -1, _id: -1 })
    .limit(100);

  return {
    status: "success",
    activities,
  };
};

module.exports = {recordTaskActivity,getTaskActivityForTask};