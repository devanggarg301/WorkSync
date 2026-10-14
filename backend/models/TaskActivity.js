const mongoose = require("mongoose");
const taskActivitySchema = new mongoose.Schema(
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

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      enum: [
        "task_created",
        "task_updated",
        "status_changed",
        "priority_changed",
        "assignee_changed",
        "task_reordered",
        "comment_added",
      ],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

taskActivitySchema.index({
  workspaceId: 1,
  projectId: 1,
  taskId: 1,
  createdAt: -1,
});

const TaskActivity = mongoose.model(
  "TaskActivity",
  taskActivitySchema
);

module.exports = TaskActivity;