
const mongoose = require("mongoose");

const {getTaskComments,createTaskComment,} = require("../services/taskCommentService");

const validateCommentRouteIds = (req, res) => {
  const { projectId, taskId } = req.params;

  if (
    !mongoose.isValidObjectId(projectId) ||
    !mongoose.isValidObjectId(taskId)
  ) {
    res.status(400).json({
      success: false,
      message: "Invalid project ID or task ID",
    });

    return false;
  }

  return true;
};

const listTaskComments = async (req, res) => {
  if (!validateCommentRouteIds(req, res)) return;

  const { workspaceId, projectId, taskId } = req.params;

  try {
    const result = await getTaskComments(workspaceId,projectId,taskId);

    if (result.status === "project_not_found") {
      return res.status(404).json({
        success: false,
        message: "Project not found in this workspace",
      });
    }

    if (result.status === "task_not_found") {
      return res.status(404).json({
        success: false,
        message: "Task not found in this project",
      });
    }

    return res.status(200).json({
      success: true,
      comments: result.comments,
    });
  } catch (error) {
    console.error("List task comments error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const addTaskComment = async (req, res) => {
  if (!validateCommentRouteIds(req, res)) return;

  const { workspaceId, projectId, taskId } = req.params;

  try {
    const result = await createTaskComment(
      req.body.body,
      workspaceId,
      projectId,
      taskId,
      req.user._id
    );

    if (result.status === "project_not_found") {
      return res.status(404).json({
        success: false,
        message: "Project not found in this workspace",
      });
    }

    if (result.status === "task_not_found") {
      return res.status(404).json({
        success: false,
        message: "Task not found in this project",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment: result.comment,
    });
  } catch (error) {
    console.error("Add task comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {listTaskComments,addTaskComment};
