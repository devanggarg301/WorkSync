const express = require("express");
const router = express.Router();

const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const authorizeWorkspace = require("../middleware/authorizeWorkspace");
const validateRequest = require("../middleware/validateRequest");

const {listTaskComments,addTaskComment,editTaskComment,removeTaskComment} = require("../controllers/taskCommentController");

const {taskCommentSchema} = require("../utils/validationSchemas");

router.get("/:workspaceId/projects/:projectId/tasks/:taskId/comments",ensureAuthenticated,authorizeWorkspace(),listTaskComments);

router.post("/:workspaceId/projects/:projectId/tasks/:taskId/comments",ensureAuthenticated,authorizeWorkspace(),validateRequest(taskCommentSchema),addTaskComment);

router.patch("/:workspaceId/projects/:projectId/tasks/:taskId/comments/:commentId",ensureAuthenticated,authorizeWorkspace(),validateRequest(taskCommentSchema),editTaskComment);

router.delete("/:workspaceId/projects/:projectId/tasks/:taskId/comments/:commentId",ensureAuthenticated,authorizeWorkspace(),removeTaskComment);

module.exports = router;