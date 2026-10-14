
const mongoose = require("mongoose");
const {createTaskInProject,getTasksByProject,updateTaskInProject,deleteTaskFromProject,moveTaskInProject} = require("../services/taskService");

const createTask = async (req, res) => {
  const { projectId } = req.params;

  if (!mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID",
    });
  }

  try {
    const result = await createTaskInProject(
        req.body,
        req.params.workspaceId,
        projectId,
        req.user._id
    );
    if (result.status === "project_not_found") {
      return res.status(404).json({
        success: false,
        message: "Project not found in this workspace",
      });
    }

    if (result.status === "assignee_not_member") {
      return res.status(422).json({
        success: false,
        message: "Assignee must be a member of this workspace",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: result.task,
    });
  } catch (error) {
    console.error("Create task error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const listProjectTasks = async (req, res) => {
  const { workspaceId, projectId } = req.params;

  if (!mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID",
    });
  }

  try {
    const result = await getTasksByProject(
      workspaceId,
      projectId
    );

    if (result.status === "project_not_found") {
      return res.status(404).json({
        success: false,
        message: "Project not found in this workspace",
      });
    }

    return res.status(200).json({
      success: true,
      tasks: result.tasks,
    });
  } catch (error) {
    console.error("Get project tasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateTask = async (req, res) => {
  const { workspaceId, projectId, taskId } = req.params;

  if (
    !mongoose.isValidObjectId(projectId) ||
    !mongoose.isValidObjectId(taskId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID or task ID",
    });
  }

  try {
    const result = await updateTaskInProject(
      req.body,
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

    if (result.status === "assignee_not_member") {
      return res.status(422).json({
        success: false,
        message: "Assignee must be a member of this workspace",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task: result.task,
    });
  } catch (error) {
    console.error("Update task error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteTask = async (req, res) => {
  const { workspaceId, projectId, taskId } = req.params;

  if (
    !mongoose.isValidObjectId(projectId) ||
    !mongoose.isValidObjectId(taskId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID or task ID",
    });
  }

  try {
    const result = await deleteTaskFromProject(
      workspaceId,
      projectId,
      taskId
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

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const moveTask = async (req, res) => {
  const { workspaceId, projectId, taskId } = req.params;

  if (
    !mongoose.isValidObjectId(projectId) ||
    !mongoose.isValidObjectId(taskId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID or task ID",
    });
  }

  try {
    const result = await moveTaskInProject(
      req.body,
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

    return res.status(200).json({
      success: true,
      message: "Task moved successfully",
      task: result.task,
    });
  } catch (error) {
    console.error("Move task error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


module.exports = {createTask,listProjectTasks,updateTask,deleteTask,moveTask};