const mongoose = require("mongoose");

const workspaceMemberSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

workspaceMemberSchema.index(
  { workspaceId: 1, userId: 1 },
  { unique: true }
);
//iska matlab hai ki (workspaceid,userid) ye combination unique hoga, ek user ek workspace me sirf ek hi role me ho sakta hai

const WorkspaceMember = mongoose.model("WorkspaceMember",workspaceMemberSchema);

module.exports = WorkspaceMember;