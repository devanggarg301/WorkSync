import {useCallback,useEffect,useMemo,useState,} from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, RefreshCw,} from "lucide-react";

import {DndContext,DragOverlay,KeyboardSensor,PointerSensor,closestCorners,pointerWithin,useSensor,useSensors,
} from "@dnd-kit/core";

import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import api from "../api/client";
import KanbanColumn from "../components/KanbanColumn";
import TaskCard from "../components/TaskCard";
import CreateTaskModal from "../components/CreateTaskModal";

const columns = [
  { id: "backlog", title: "Backlog" },
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "in_review", title: "In Review" },
  { id: "done", title: "Done" },
];

const sortByPosition = (a, b) => a.position - b.position;

const kanbanCollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  return pointerCollisions.length > 0
    ? pointerCollisions
    : closestCorners(args);
};

function ProjectPage() {
  const { workspaceId, projectId } = useParams();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [boardError, setBoardError] = useState("");

  const [showCreateTaskModal, setShowCreateTaskModal] =
    useState(false);

  const [activeTaskId, setActiveTaskId] = useState(null);
  const [movingTaskId, setMovingTaskId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadProjectData = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    setRefreshError("");
    setBoardError("");

    try {
      const [projectResponse, tasksResponse] = await Promise.all([
        api.get(
          `/workspaces/${workspaceId}/projects/${projectId}`,
          { signal }
        ),
        api.get(
          `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
          { signal }
        ),
      ]);

      if (signal?.aborted) return;

      setProject(projectResponse.data.project);
      setTasks(tasksResponse.data.tasks);
    } catch (err) {
      if (signal?.aborted) return;

      setError(
        err.response?.data?.message ||
          "Unable to load this project."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [workspaceId, projectId]);

  useEffect(() => {
    const controller = new AbortController();

    void loadProjectData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadProjectData]);
  const refreshTasks = useCallback(async () => {
    setRefreshError("");

    try {
      const response = await api.get(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks`
      );

      setTasks(response.data.tasks);
    } catch (err) {
      setRefreshError(
        err.response?.data?.message ||
          "Unable to refresh tasks. Please try again."
      );
    }
  }, [workspaceId, projectId]);

  const tasksByStatus = useMemo(() => {
    const grouped = Object.fromEntries(
      columns.map((column) => [column.id, []])
    );

    for (const task of tasks) {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    }

    for (const columnTasks of Object.values(grouped)) {
      columnTasks.sort(sortByPosition);
    }

    return grouped;
  }, [tasks]);

  const handleTaskMove = useCallback(
    async (taskId, newStatus, targetIndex) => {
      if (movingTaskId) return;

      const previousTasks = tasks;

      const draggedTask = tasks.find(
        (task) => task._id === taskId
      );

      if (!draggedTask) return;

      const oldStatus = draggedTask.status;
      const sameColumn = oldStatus === newStatus;

      const sourceColumn = tasks
        .filter((task) => task.status === oldStatus)
        .sort(sortByPosition);

      const sourceIndex = sourceColumn.findIndex(
        (task) => task._id === taskId
      );

      const remainingSource = sourceColumn.filter(
        (task) => task._id !== taskId
      );

      const destinationColumn = sameColumn
        ? [...remainingSource]
        : tasks
            .filter(
              (task) =>
                task.status === newStatus &&
                task._id !== taskId
            )
            .sort(sortByPosition);

      const safePosition = Math.max(
        0,
        Math.min(targetIndex, destinationColumn.length)
      );

      if (sameColumn && safePosition === sourceIndex) {
        return;
      }

      const movedTask = {
        ...draggedTask,
        status: newStatus,
      };

      destinationColumn.splice(safePosition, 0, movedTask);

      const updates = new Map();

      if (sameColumn) {
        destinationColumn.forEach((task, index) => {
          updates.set(task._id, {
            ...task,
            status: newStatus,
            position: index,
          });
        });
      } else {
        remainingSource.forEach((task, index) => {
          updates.set(task._id, {
            ...task,
            position: index,
          });
        });

        destinationColumn.forEach((task, index) => {
          updates.set(task._id, {
            ...task,
            status: newStatus,
            position: index,
          });
        });
      }

      setTasks((currentTasks) =>
        currentTasks.map(
          (task) => updates.get(task._id) || task
        )
      );

      setMovingTaskId(taskId);
      setBoardError("");
      setRefreshError("");

      try {
        await api.patch(
          `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/move`,
          {
            status: newStatus,
            position: safePosition,
          }
        );

        await refreshTasks();
      } catch (err) {
        setTasks(previousTasks);

        setBoardError(
          err.response?.data?.message ||
            "Task move failed. The previous board state was restored."
        );
      } finally {
        setMovingTaskId(null);
      }
    },
    [
      tasks,
      movingTaskId,
      workspaceId,
      projectId,
      refreshTasks,
    ]
  );

  const handleDragEnd = ({active,over,activatorEvent,delta,}) => {
    setActiveTaskId(null);
    if (!over || movingTaskId) return;
    const taskId = String(active.id);
    const draggedTask = tasks.find(
      (task) => task._id === taskId
    );

    if (!draggedTask) return;

    let destinationStatus;
    let targetIndex;

    if (over.data.current?.type === "column") {
      destinationStatus = over.data.current.status;

      targetIndex = tasks.filter(
        (task) =>
          task.status === destinationStatus &&
          task._id !== taskId
      ).length;
    } else {
      const targetTask = tasks.find(
        (task) => task._id === String(over.id)
      );

      if (!targetTask || targetTask._id === taskId) {
        return;
      }

      destinationStatus = targetTask.status;

      const destinationTasks = tasks
        .filter(
          (task) =>
            task.status === destinationStatus &&
            task._id !== taskId
        )
        .sort(sortByPosition);

      const targetIndexInRemaining = destinationTasks.findIndex(
        (task) => task._id === targetTask._id
      );

      if (targetIndexInRemaining < 0) return;
      const translatedRect = active.rect.current.translated;

      const pointerY =
        typeof activatorEvent?.clientY === "number"
          ? activatorEvent.clientY + delta.y
          : translatedRect
            ? translatedRect.top + translatedRect.height / 2
            : over.rect.top + over.rect.height / 2;

      const targetMiddleY =
        over.rect.top + over.rect.height / 2;
      const insertAfter = pointerY >= targetMiddleY;

      targetIndex =
        targetIndexInRemaining + (insertAfter ? 1 : 0);
    }

    void handleTaskMove(
      taskId,
      destinationStatus,
      targetIndex
    );
  };

  const activeTask = tasks.find(
    (task) => task._id === activeTaskId
  );

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />

        <div className="mt-6 h-32 animate-pulse rounded-xl bg-white" />

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <Link
          to={`/workspaces/${workspaceId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600"
        >
          <ArrowLeft size={16} />
          Back to workspace
        </Link>

        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm text-red-700">
            {error || "Project not found."}
          </p>

          <button
            type="button"
            onClick={() => loadProjectData()}
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-700"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8 md:px-8 md:py-10">
      <Link
        to={`/workspaces/${workspaceId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
      >
        <ArrowLeft size={16} />
        Back to workspace
      </Link>

      {/* Project details */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                {project.name}
              </h1>

              <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                {project.key}
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              {project.description ||
                "No project description provided."}
            </p>

            {project.createdBy && (
              <p className="mt-3 text-xs text-slate-400">
                Created by {project.createdBy.username}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => loadProjectData()}
            disabled={Boolean(movingTaskId)}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </section>

      {/* Kanban board */}
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Board
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Drag tasks between columns or reorder them.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {tasks.length}{" "}
              {tasks.length === 1 ? "task" : "tasks"}
            </span>

            <button
              type="button"
              onClick={() => setShowCreateTaskModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <Plus size={17} />
              Create task
            </button>
          </div>
        </div>

        {boardError && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3"
          >
            <p className="text-sm text-red-700">{boardError}</p>

            <button
              type="button"
              onClick={() => loadProjectData()}
              className="text-sm font-semibold text-red-700 underline"
            >
              Reload board
            </button>
          </div>
        )}

        {refreshError && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3"
          >
            <p className="text-sm text-amber-800">
              {refreshError}
            </p>

            <button
              type="button"
              onClick={refreshTasks}
              className="text-sm font-semibold text-amber-800 underline"
            >
              Retry
            </button>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollisionDetection}
          onDragStart={({ active }) => {
            setActiveTaskId(String(active.id));
          }}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTaskId(null)}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                movingTaskId={movingTaskId}
                tasks={tasksByStatus[column.id]}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="w-72 rotate-1 rounded-lg shadow-xl">
                <TaskCard task={activeTask} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </section>

      {/* Create task modal */}
      {showCreateTaskModal && (
        <CreateTaskModal
          workspaceId={workspaceId}
          projectId={projectId}
          onClose={() => setShowCreateTaskModal(false)}
          onCreated={refreshTasks}
        />
      )}
    </main>
  );
}
export default ProjectPage;