const Project = require("../models/Project");

const createProjectInWorkspace = async ({ name, key, description },workspaceId,userId) => {
  const project = await Project.create({
    workspaceId,
    name,
    key,
    description,
    createdBy: userId,
  });

  return project;
};

const getWorkspaceProjects = async (workspaceId) => {
  const projects = await Project.find({ workspaceId })
    .select(
      "workspaceId name key description createdBy createdAt updatedAt"
    )
    .populate({
      path: "createdBy",
      select: "username avatarUrl",
    })
    .sort({ createdAt: -1 });

  return projects;
};

const getProjectById = async (workspaceId, projectId) => {
  return Project.findOne({
    _id: projectId,
    workspaceId,
  })
    .select(
      "workspaceId name key description createdBy createdAt updatedAt"
    )
    .populate({
      path: "createdBy",
      select: "username avatarUrl",
    });
};

module.exports = {createProjectInWorkspace, getWorkspaceProjects,getProjectById};