const mongoose = require("mongoose");

const taskCommentSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },

    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 3000,
    },
  },
  {
    timestamps: true,
  }
);

taskCommentSchema.index({
  workspaceId: 1,
  projectId: 1,
  taskId: 1,
  createdAt: 1,
});

const TaskComment = mongoose.model("TaskComment",taskCommentSchema);
module.exports = TaskComment;