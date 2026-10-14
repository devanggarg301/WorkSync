const express = require("express");
const router = express.Router();

const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const authorizeWorkspace = require("../middleware/authorizeWorkspace");
const validateRequest = require("../middleware/validateRequest");

const {createTask,listProjectTasks,updateTask,deleteTask,moveTask} = require("../controllers/taskController");

const {createTaskSchema,updateTaskSchema,taskMoveSchema} = require("../utils/validationSchemas");

router.post( "/:workspaceId/projects/:projectId/tasks",ensureAuthenticated,validateRequest(createTaskSchema),authorizeWorkspace(),createTask);
router.get("/:workspaceId/projects/:projectId/tasks",ensureAuthenticated,authorizeWorkspace(),listProjectTasks);
router.patch("/:workspaceId/projects/:projectId/tasks/:taskId",ensureAuthenticated,authorizeWorkspace(),validateRequest(updateTaskSchema),updateTask);
router.delete("/:workspaceId/projects/:projectId/tasks/:taskId",ensureAuthenticated,authorizeWorkspace("owner", "admin"),deleteTask);
router.patch("/:workspaceId/projects/:projectId/tasks/:taskId/move",ensureAuthenticated,validateRequest(taskMoveSchema),authorizeWorkspace(),moveTask);


module.exports = router;