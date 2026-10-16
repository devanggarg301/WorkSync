const express = require("express");

const router = express.Router();

const validateObjectIdParam = require("../middleware/validateObjectIdParam");

const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const validateRequest = require("../middleware/validateRequest");
const authorizeWorkspace = require("../middleware/authorizeWorkspace");

const {create,getMyWorkspaces,getWorkspace,updateWorkspaceDetails,updateWorkspaceMemberRole,listWorkspaceMembers,addMember,removeMember } = require("../controllers/workspaceController");

const {createWorkspaceSchema,updateWorkspaceSchema,updateWorkspaceMemberRoleSchema,addWorkspaceMemberSchema} = require("../utils/validationSchemas");

const {createInvitation,listInvitations,revokeInvitation,acceptInvitation,} = require("../controllers/workspaceInvitationController");

router.post("/",ensureAuthenticated,validateRequest(createWorkspaceSchema),create);
router.get("/",ensureAuthenticated,getMyWorkspaces );
router.get("/:workspaceId",ensureAuthenticated,authorizeWorkspace(),getWorkspace);
router.patch("/:workspaceId",ensureAuthenticated,validateRequest(updateWorkspaceSchema),authorizeWorkspace("owner","admin"),updateWorkspaceDetails);
router.patch("/:workspaceId/members/:userId/role",ensureAuthenticated,validateRequest(updateWorkspaceMemberRoleSchema),authorizeWorkspace("owner","admin"),updateWorkspaceMemberRole);
router.get("/:workspaceId/members",ensureAuthenticated,authorizeWorkspace(),listWorkspaceMembers);
router.post("/:workspaceId/members",ensureAuthenticated,validateRequest(addWorkspaceMemberSchema),authorizeWorkspace("owner", "admin"),addMember);
router.delete("/:workspaceId/members/:userId",ensureAuthenticated,authorizeWorkspace("owner", "admin"),removeMember);

router.post("/invitations/:token/accept",ensureAuthenticated,acceptInvitation);
router.post("/:workspaceId/invitations",ensureAuthenticated,validateObjectIdParam("workspaceId"),validateRequest(addWorkspaceMemberSchema),authorizeWorkspace("owner", "admin"),createInvitation);
router.get("/:workspaceId/invitations",ensureAuthenticated,validateObjectIdParam("workspaceId"),authorizeWorkspace("owner", "admin"),listInvitations);
router.delete("/:workspaceId/invitations/:invitationId",ensureAuthenticated,validateObjectIdParam("workspaceId"),validateObjectIdParam("invitationId"),authorizeWorkspace("owner", "admin"),revokeInvitation);

module.exports = router;