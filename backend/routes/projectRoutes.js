const express = require("express");
const router = express.Router();

const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const authorizeWorkspace = require("../middleware/authorizeWorkspace");
const validateRequest = require("../middleware/validateRequest");

const {createProject,listWorkspaceProjects,getProject} = require("../controllers/projectController");

const {createProjectSchema} = require("../utils/validationSchemas");

router.post("/:workspaceId/projects",ensureAuthenticated,validateRequest(createProjectSchema),authorizeWorkspace("owner", "admin"),createProject);
router.get("/:workspaceId/projects",ensureAuthenticated,authorizeWorkspace(),listWorkspaceProjects );
router.get( "/:workspaceId/projects/:projectId", ensureAuthenticated, authorizeWorkspace(), getProject);

module.exports = router;