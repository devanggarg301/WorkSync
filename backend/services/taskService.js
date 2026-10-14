
const Project = require("../models/Project");
const Task = require("../models/Task");
const WorkspaceMember = require("../models/WorkspaceMember");
const mongoose = require("mongoose");

const createTaskInProject = async (data,workspaceId,projectId,userId) => {
  const project = await Project.findOne({
    _id: projectId,
    workspaceId,
  }).select("_id");

  if (!project) {
    return { status: "project_not_found" };
  }

  const assigneeId = data.assigneeId || null;

  // An assignee must be a member of the same workspace.
  if (assigneeId) {
    const assigneeMembership = await WorkspaceMember.findOne({
      workspaceId,
      userId: assigneeId,
    }).select("_id");

    if (!assigneeMembership) {
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

  const position = lastTask ? lastTask.position + 1 : 0;

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

  return {
    status: "created",
    task,
  };
};


const getTasksByProject = async (workspaceId, projectId) => {
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

const updateTaskInProject = async (data,workspaceId,projectId,taskId) => {
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
  }).select("_id status position");

  if (!task) {
    return { status: "task_not_found" };
  }

  if (data.assigneeId && data.assigneeId !== null) {
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
  { status: newStatus, position: requestedPosition },workspaceId,projectId,taskId) => {
  const session = await mongoose.startSession();
  let outcome;
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
      const oldStatus = task.status;

      const sourceTasks = await Task.find({
        workspaceId,
        projectId,
        status: oldStatus,
      })
        .sort({ position: 1, createdAt: 1, _id: 1 })
        .session(session);

      const remainingSourceTasks = sourceTasks.filter(
        (item) => item._id.toString() !== taskId.toString()
      );

      if (oldStatus === newStatus) {
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

        await Task.bulkWrite(operations, { session });
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

        await Task.bulkWrite(
          [...sourceOperations, ...destinationOperations],
          { session }
        );
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

    return {
      status: "moved",
      task: movedTask,
    };
  } finally {
    await session.endSession();
  }
};


module.exports = {createTaskInProject,getTasksByProject,updateTaskInProject,deleteTaskFromProject,moveTaskInProject};