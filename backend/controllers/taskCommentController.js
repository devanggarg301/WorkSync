
const mongoose = require("mongoose");

const {getTaskComments,createTaskComment,updateTaskComment,deleteTaskComment} = require("../services/taskCommentService");

const validateCommentRouteIds = (req, res) => {
  const { projectId, taskId, commentId } = req.params;

  if (
    !mongoose.isValidObjectId(projectId) ||
    !mongoose.isValidObjectId(taskId) ||
    (commentId && !mongoose.isValidObjectId(commentId))
  ) {
    res.status(400).json({
      success: false,
      message: "Invalid project ID, task ID, or comment ID",
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

const editTaskComment = async (req, res) => {
  if (!validateCommentRouteIds(req, res)) return;

  const { workspaceId, projectId, taskId, commentId } = req.params;

  try {
    const result = await updateTaskComment(req.body.body,workspaceId,projectId,taskId,commentId,req.user._id);

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

    if (result.status === "comment_not_found") {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (result.status === "forbidden") {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own comments",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      comment: result.comment,
    });
  } catch (error) {
    console.error("Edit task comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const removeTaskComment = async (req, res) => {
  if (!validateCommentRouteIds(req, res)) return;

  const { workspaceId, projectId, taskId, commentId } = req.params;

  try {
    const result = await deleteTaskComment(workspaceId,projectId,taskId,commentId,req.user._id);

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

    if (result.status === "comment_not_found") {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (result.status === "forbidden") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this comment",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete task comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {listTaskComments,addTaskComment,editTaskComment,removeTaskComment};