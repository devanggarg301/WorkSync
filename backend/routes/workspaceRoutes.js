const express = require("express");

const router = express.Router();

const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const validateRequest = require("../middleware/validateRequest");
const authorizeWorkspace = require("../middleware/authorizeWorkspace");

const {create,getMyWorkspaces,getWorkspace,updateWorkspaceDetails,updateWorkspaceMemberRole,listWorkspaceMembers,addMember,removeMember } = require("../controllers/workspaceController");

const {createWorkspaceSchema,updateWorkspaceSchema,updateWorkspaceMemberRoleSchema,addWorkspaceMemberSchema} = require("../utils/validationSchemas");

router.post("/",ensureAuthenticated,validateRequest(createWorkspaceSchema),create);
router.get("/",ensureAuthenticated,getMyWorkspaces );
router.get("/:workspaceId",ensureAuthenticated,authorizeWorkspace(),getWorkspace);
router.patch("/:workspaceId",ensureAuthenticated,validateRequest(updateWorkspaceSchema),authorizeWorkspace("owner","admin"),updateWorkspaceDetails);
router.patch("/:workspaceId/members/:userId/role",ensureAuthenticated,validateRequest(updateWorkspaceMemberRoleSchema),authorizeWorkspace("owner","admin"),updateWorkspaceMemberRole);
router.get("/:workspaceId/members",ensureAuthenticated,authorizeWorkspace(),listWorkspaceMembers);
router.post("/:workspaceId/members",ensureAuthenticated,validateRequest(addWorkspaceMemberSchema),authorizeWorkspace("owner", "admin"),addMember);
router.delete("/:workspaceId/members/:userId",ensureAuthenticated,authorizeWorkspace("owner", "admin"),removeMember);

module.exports = router;