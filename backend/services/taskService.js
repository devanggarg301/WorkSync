const mongoose = require("mongoose")
const Project = require("../models/Project");
const Task = require("../models/Task");
const WorkspaceMember = require("../models/WorkspaceMember");

const {recordTaskActivity} = require("./taskActivityService");
const { createNotification } = require("./notificationService");

const notifyTaskAssignee = async ({recipientId,actorId,workspaceId,projectId,taskId,taskTitle,}) => {
  if (!recipientId ||String(recipientId) === String(actorId)) {
    return;
  }
  try {
    await createNotification({
      recipientId,
      actorId,
      type: "task_assigned",
      title: "You were assigned a task",
      message: `You were assigned "${taskTitle}"`,
      workspaceId,
      projectId,
      taskId,
    });
  } catch (error) {
    console.error(
      "Task assignment notification error:",
      error
    );
  }
};

const createTaskInProject = async (data,workspaceId,projectId,userId) => {
  const project = await Project.findOne({
    _id: projectId,
    workspaceId,
  }).select("_id");

  if (!project) {
    return { status: "project_not_found" };
  }

  const assigneeId = data.assigneeId || null;

  if (assigneeId) {
    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: assigneeId,
    }).select("_id");

    if (!membership) {
      return { status: "assignee_not_member" };
    }
  }

  const status = data.status || "todo";

  const lastTask = await Task.findOne({
    workspaceId,
    projectId,
    status,
  })
    .sort({ position: -1 })
    .select("position");

  const position = lastTask
    ? lastTask.position + 1
    : 0;

  const task = await Task.create({
    workspaceId,
    projectId,
    title: data.title,
    description: data.description,
    status,
    priority: data.priority,
    assignee: assigneeId,
    createdBy: userId,
    dueDate: data.dueDate,
    labels: data.labels,
    position,
  });

  await task.populate([
    {
      path: "assignee",
      select: "username avatarUrl",
    },
    {
      path: "createdBy",
      select: "username avatarUrl",
    },
  ]);

  await recordTaskActivity({
    workspaceId,
    projectId,
    taskId: task._id,
    actorId: userId,
    action: "task_created",
    message: `created task "${task.title}"`,
  });

  await notifyTaskAssignee({
  recipientId: assigneeId,
  actorId: userId,
  workspaceId,
  projectId,
  taskId: task._id,
  taskTitle: task.title,
});

  return {
    status: "created",
    task,
  };
};

const getTasksByProject = async (workspaceId,projectId) => {
  const project = await Project.findOne({
    _id: projectId,
    workspaceId,
  }).select("_id");

  if (!project) {
    return { status: "project_not_found" };
  }

  const tasks = await Task.find({
    workspaceId,
    projectId,
  })
    .populate({
      path: "assignee",
      select: "username avatarUrl",
    })
    .populate({
      path: "createdBy",
      select: "username avatarUrl",
    })
    .sort({ position: 1, createdAt: 1 });

  return {
    status: "success",
    tasks,
  };
};

const updateTaskInProject = async (data,workspaceId,projectId,taskId,actorId) => {
  const project = await Project.findOne({
    _id: projectId,
    workspaceId,
  }).select("_id");

  if (!project) {
    return { status: "project_not_found" };
  }

  
  const task = await Task.findOne({
    _id: taskId,
    workspaceId,
    projectId,
  }).select(
    "_id title description status priority assignee dueDate labels position"
  );

  if (!task) {
    return { status: "task_not_found" };
  }

  if (data.assigneeId) {
    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: data.assigneeId,
    }).select("_id");

    if (!membership) {
      return { status: "assignee_not_member" };
    }
  }

  const updates = {};

  if (data.title !== undefined) {
    updates.title = data.title;
  }

  if (data.description !== undefined) {
    updates.description = data.description;
  }

  if (data.priority !== undefined) {
    updates.priority = data.priority;
  }

  if (data.dueDate !== undefined) {
    updates.dueDate = data.dueDate;
  }

  if (data.labels !== undefined) {
    updates.labels = data.labels;
  }

  if (data.assigneeId !== undefined) {
    updates.assignee = data.assigneeId;
  }

  
  if (data.status !== undefined) {
    updates.status = data.status;

    if (data.status !== task.status) {
      const lastTask = await Task.findOne({
        workspaceId,
        projectId,
        status: data.status,
        _id: { $ne: taskId },
      })
        .sort({ position: -1 })
        .select("position");

      updates.position = lastTask
        ? lastTask.position + 1
        : 0;
    }
  }

  const updatedTask = await Task.findOneAndUpdate(
    {
      _id: taskId,
      workspaceId,
      projectId,
    },
    {
      $set: updates,
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).populate([
    {
      path: "assignee",
      select: "username avatarUrl",
    },
    {
      path: "createdBy",
      select: "username avatarUrl",
    },
  ]);

  if (!updatedTask) {
    return { status: "task_not_found" };
  }

  const activityEvents = [];

  const getReferenceId = (value) =>
    value ? String(value._id || value) : null;

  const normalize = (value) =>
    value instanceof Date
      ? value.getTime()
      : JSON.stringify(value ?? null);

  const readableValue = (value) =>
    String(value ?? "none").replace(/_/g, " ");

  if (task.status !== updatedTask.status) {
    activityEvents.push({
      action: "status_changed",
      message: `changed status from ${readableValue(task.status)} to ${readableValue(updatedTask.status)}`,
      metadata: {
        from: task.status,
        to: updatedTask.status,
      },
    });
  }

  if (task.priority !== updatedTask.priority) {
    activityEvents.push({
      action: "priority_changed",
      message: `changed priority from ${task.priority} to ${updatedTask.priority}`,
      metadata: {
        from: task.priority,
        to: updatedTask.priority,
      },
    });
  }

  const oldAssigneeId = getReferenceId(task.assignee);
  const newAssigneeId = getReferenceId(updatedTask.assignee);

  if (oldAssigneeId !== newAssigneeId) {
    activityEvents.push({
      action: "assignee_changed",
      message: newAssigneeId
        ? "changed the task assignee"
        : "unassigned the task",
      metadata: {
        from: oldAssigneeId,
        to: newAssigneeId,
      },
    });
  }

  const detailFields = [
    "title",
    "description",
    "dueDate",
    "labels",
  ];

  const changedFields = detailFields.filter(
    (field) => normalize(task[field]) !== normalize(updatedTask[field])
  );

  if (changedFields.length > 0) {
    activityEvents.push({
      action: "task_updated",
      message: "updated task details",
      metadata: {
        changedFields,
      },
    });
  }

  await Promise.all(
    activityEvents.map((event) =>
      recordTaskActivity({
        workspaceId,
        projectId,
        taskId,
        actorId,
        ...event,
      })
    )
  );

  if (oldAssigneeId !== newAssigneeId && newAssigneeId) {
  await notifyTaskAssignee({
    recipientId: newAssigneeId,
    actorId,
    workspaceId,
    projectId,
    taskId: updatedTask._id,
    taskTitle: updatedTask.title,
  });
}

  return {
    status: "updated",
    task: updatedTask,
  };
};

const deleteTaskFromProject = async (workspaceId,projectId,taskId) => {
  const project = await Project.findOne({
    _id: projectId,
    workspaceId,
  }).select("_id");

  if (!project) {
    return { status: "project_not_found" };
  }

  const deletedTask = await Task.findOneAndDelete({
    _id: taskId,
    workspaceId,
    projectId,
  });

  if (!deletedTask) {
    return { status: "task_not_found" };
  }

  return { status: "deleted" };
};

const moveTaskInProject = async (
  { status: newStatus, position: requestedPosition },
  workspaceId,
  projectId,
  taskId,
  actorId
) => {
  const session = await mongoose.startSession();

  let outcome;
  let previousStatus = null;
  let previousPosition = null;

  try {
    await session.withTransaction(async () => {
      const project = await Project.findOne({
        _id: projectId,
        workspaceId,
      })
        .select("_id")
        .session(session);

      if (!project) {
        outcome = { status: "project_not_found" };
        return;
      }

      const task = await Task.findOne({
        _id: taskId,
        workspaceId,
        projectId,
      }).session(session);

      if (!task) {
        outcome = { status: "task_not_found" };
        return;
      }

      previousStatus = task.status;
      previousPosition = task.position;

      const sourceTasks = await Task.find({
        workspaceId,
        projectId,
        status: previousStatus,
      })
        .sort({ position: 1, createdAt: 1, _id: 1 })
        .session(session);

      const remainingSourceTasks = sourceTasks.filter(
        (item) => item._id.toString() !== taskId.toString()
      );

      if (previousStatus === newStatus) {
        
        const orderedTasks = [...remainingSourceTasks];

        const insertAt = Math.min(
          requestedPosition,
          orderedTasks.length
        );

        orderedTasks.splice(insertAt, 0, task);

        const operations = orderedTasks.map((item, index) => ({
          updateOne: {
            filter: {
              _id: item._id,
              workspaceId,
              projectId,
            },
            update: {
              $set: {
                status: newStatus,
                position: index,
              },
            },
          },
        }));

        if (operations.length > 0) {
          await Task.bulkWrite(operations, { session });
        }
      } else {
        
        const destinationTasks = await Task.find({
          workspaceId,
          projectId,
          status: newStatus,
        })
          .sort({ position: 1, createdAt: 1, _id: 1 })
          .session(session);

        const insertAt = Math.min(
          requestedPosition,
          destinationTasks.length
        );

        destinationTasks.splice(insertAt, 0, task);

        const sourceOperations = remainingSourceTasks.map(
          (item, index) => ({
            updateOne: {
              filter: {
                _id: item._id,
                workspaceId,
                projectId,
              },
              update: {
                $set: { position: index },
              },
            },
          })
        );

        const destinationOperations = destinationTasks.map(
          (item, index) => ({
            updateOne: {
              filter: {
                _id: item._id,
                workspaceId,
                projectId,
              },
              update: {
                $set: {
                  status: newStatus,
                  position: index,
                },
              },
            },
          })
        );

        const operations = [
          ...sourceOperations,
          ...destinationOperations,
        ];

        if (operations.length > 0) {
          await Task.bulkWrite(operations, { session });
        }
      }

      outcome = { status: "moved" };
    });

    if (outcome?.status !== "moved") {
      return outcome;
    }

    const movedTask = await Task.findOne({
      _id: taskId,
      workspaceId,
      projectId,
    }).populate([
      {
        path: "assignee",
        select: "username avatarUrl",
      },
      {
        path: "createdBy",
        select: "username avatarUrl",
      },
    ]);

    if (!movedTask) {
      return { status: "task_not_found" };
    }

    if (previousStatus !== movedTask.status) {
      await recordTaskActivity({
        workspaceId,
        projectId,
        taskId,
        actorId,
        action: "status_changed",
        message: `moved task from ${previousStatus.replace(/_/g, " ")} to ${movedTask.status.replace(/_/g, " ")}`,
        metadata: {
          from: previousStatus,
          to: movedTask.status,
        },
      });
    } else if (previousPosition !== movedTask.position) {
      await recordTaskActivity({
        workspaceId,
        projectId,
        taskId,
        actorId,
        action: "task_reordered",
        message: `reordered task in ${movedTask.status.replace(/_/g, " ")}`,
        metadata: {
          fromPosition: previousPosition,
          toPosition: movedTask.position,
        },
      });
    }

    return {
      status: "moved",
      task: movedTask,
    };
  } finally {
    await session.endSession();
  }
};

module.exports = {createTaskInProject,getTasksByProject,updateTaskInProject,deleteTaskFromProject,moveTaskInProject};