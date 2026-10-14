
const mongoose = require("mongoose");

const {getTaskActivityForTask} = require("../services/taskActivityService");

const listTaskActivity = async (req, res) => {
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
    const result = await getTaskActivityForTask(workspaceId,projectId,taskId);
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
      activities: result.activities,
    });
  } catch (error) {
    console.error("List task activity error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {listTaskActivity};