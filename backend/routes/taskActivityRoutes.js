const express = require("express");
const router = express.Router();

const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const authorizeWorkspace = require("../middleware/authorizeWorkspace");

const {listTaskActivity} = require("../controllers/taskActivityController");

router.get("/:workspaceId/projects/:projectId/tasks/:taskId/activity",ensureAuthenticated,authorizeWorkspace(),listTaskActivity);

module.exports = router;