const mongoose = require("mongoose");
const WorkspaceMember = require("../models/WorkspaceMember");

const authorizeWorkspace = (...allowedRoles) => {
  return async (req, res, next) => {
    const { workspaceId } = req.params;

    if (!mongoose.isValidObjectId(workspaceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID",
      });
    }

    try {
      const membership = await WorkspaceMember.findOne({
        workspaceId,
        userId: req.user._id,
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this workspace",
        });
      }

      if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(membership.role)
      ) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action",
        });
      }

      req.workspaceMembership = membership;

      return next();
    } catch (error) {
      console.error("Workspace authorization error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};

module.exports = authorizeWorkspace;