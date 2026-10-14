const mongoose = require("mongoose");
const {createProjectInWorkspace,getWorkspaceProjects,getProjectById} = require("../services/projectService");

const createProject = async (req, res) => {
  try {
    const project = await createProjectInWorkspace(
      req.body,
      req.params.workspaceId,
      req.user._id
    );

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A project with this key already exists in this workspace",
      });
    }
    console.error("Create project error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const listWorkspaceProjects = async (req, res) => {
  try {
    const projects = await getWorkspaceProjects(
      req.params.workspaceId
    );

    return res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get workspace projects error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getProject = async (req, res) => {
  const { workspaceId, projectId } = req.params;

  if (!mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID",
    });
  }

  try {
    const project = await getProjectById(
      workspaceId,
      projectId
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found in this workspace",
      });
    }

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Get project error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {createProject,listWorkspaceProjects,getProject};