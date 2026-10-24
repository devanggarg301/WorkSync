import {useCallback,useEffect,useMemo,useState,} from "react";
import {Link,useLocation,useNavigate,useParams,} from "react-router-dom";
import {ArrowLeft,Plus,RefreshCw,Search,X,LayoutGrid,List,CalendarDays,ChevronLeft,ChevronRight,} from "lucide-react";

import {DndContext,DragOverlay,KeyboardSensor,PointerSensor,closestCorners,pointerWithin,useSensor,useSensors,
} from "@dnd-kit/core";

import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";


import api from "../api/client";
import KanbanColumn from "../components/KanbanColumn";
import TaskCard from "../components/TaskCard";
import CreateTaskModal from "../components/CreateTaskModal";
import TaskDetailsModal from "../components/TaskDetailsModal";


const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const getAssigneeId = (assignee) => {
  if (!assignee) return "";

  if (typeof assignee === "string") {
    return assignee;
  }

  return String(assignee._id || assignee.userId || "");
};

const columns = [
  { id: "backlog", title: "Backlog" },
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "in_review", title: "In Review" },
  { id: "done", title: "Done" },
];

const sortByPosition = (a, b) => a.position - b.position;

const statusStyles = {
  backlog: "bg-slate-100 text-slate-700",
  todo: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  in_review: "bg-violet-50 text-violet-700",
  done: "bg-emerald-50 text-emerald-700",
};

const priorityStyles = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

// Parse date-only strings as local calendar dates so they do not shift
// to the previous day in time zones west of UTC.
const parseCalendarDate = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
      const [, yearText, monthText, dayText] = match;
      const year = Number(yearText);
      const month = Number(monthText);
      const day = Number(dayText);
      const date = new Date(year, month - 1, day);

      // JavaScript normalizes impossible dates (for example, February 31).
      // Reject those values instead of silently moving them into another month.
      if (
        Number.isNaN(date.getTime()) ||
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        return null;
      }

      return date;
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Build a local YYYY-MM-DD key without converting the date to UTC. This keeps
// calendar tasks on the date users selected in the task form.
const getCalendarDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDueDate = (value) => {
  if (!value) return "No due date";

  const date = parseCalendarDate(value);
  if (!date) return "Invalid date";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getAssigneeName = (assignee, workspaceMembers) => {
  if (!assignee) return "Unassigned";

  if (typeof assignee === "object") {
    if (assignee.username || assignee.email) {
      return assignee.username || assignee.email;
    }
  }

  const assigneeId = getAssigneeId(assignee);
  const member = workspaceMembers.find(
    (workspaceMember) => String(workspaceMember.userId) === assigneeId
  );

  return member?.username || member?.email || "Assigned";
};

const kanbanCollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  return pointerCollisions.length > 0
    ? pointerCollisions
    : closestCorners(args);
};

function ProjectPage() {
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

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
  const [selectedTask, setSelectedTask] = useState(null);
  const [workspaceRole, setWorkspaceRole] = useState(null);
  const [workspaceRoleLoading, setWorkspaceRoleLoading] = useState(true);
  const [viewMode, setViewMode] = useState("board");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [expandedCalendarDate, setExpandedCalendarDate] = useState(null);

const [searchQuery, setSearchQuery] = useState("");
const [statusFilter, setStatusFilter] = useState("");
const [priorityFilter, setPriorityFilter] = useState("");
const [assigneeFilter, setAssigneeFilter] = useState("");
const [dueDateFilter, setDueDateFilter] = useState("");

const [workspaceMembers, setWorkspaceMembers] = useState([]);
const [workspaceMembersLoading, setWorkspaceMembersLoading] =useState(true);
const [workspaceMembersError, setWorkspaceMembersError] =useState("");

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

    useEffect(() => {
    const requestedTaskId = location.state?.openTaskId;
    if (!requestedTaskId || loading) {
      return;
    }
    const taskToOpen = tasks.find(
      (task) =>
        String(task._id) === String(requestedTaskId)
    );

    if (taskToOpen) {
      setSelectedTask(taskToOpen);
    }

    navigate(
      `${location.pathname}${location.search}`,
      {
        replace: true,
        state: null,
      }
    );
  }, [location.state,location.pathname,location.search,loading,tasks,navigate]);
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

  const filteredTasks = useMemo(() => {
  const query = searchQuery.trim().toLowerCase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return tasks.filter((task) => {
    
    if (query) {
      const searchableText =
        `${task.title || ""} ${task.description || ""}`
          .toLowerCase();

      if (!searchableText.includes(query)) {
        return false;
      }
    }

    
    if (statusFilter && task.status !== statusFilter) {
      return false;
    }

    
    if (priorityFilter && task.priority !== priorityFilter) {
      return false;
    }

    
    if (
      assigneeFilter &&
      getAssigneeId(task.assignee) !== assigneeFilter
    ) {
      return false;
    }

    
    if (dueDateFilter === "no_date") {
      if (task.dueDate) return false;
    } else if (dueDateFilter) {
      
      if (!task.dueDate || task.status === "done") {
        return false;
      }

      const dueDate = parseCalendarDate(task.dueDate);

      if (!dueDate) {
        return false;
      }

      dueDate.setHours(0, 0, 0, 0);

      if (dueDateFilter === "overdue" && dueDate >= today) {
        return false;
      }

      if (
        dueDateFilter === "next_7_days" &&
        (dueDate < today || dueDate > nextWeek)
      ) {
        return false;
      }
    }

    return true;
  });
}, [
  tasks,
  searchQuery,
  statusFilter,
  priorityFilter,
  assigneeFilter,
  dueDateFilter,
]);

const hasActiveFilters = Boolean(
  searchQuery.trim() ||
    statusFilter ||
    priorityFilter ||
    assigneeFilter ||
    dueDateFilter
);

const tasksByStatus = useMemo(() => {
  const grouped = Object.fromEntries(
    columns.map((column) => [column.id, []])
  );

  for (const task of filteredTasks) {
    if (grouped[task.status]) {
      grouped[task.status].push(task);
    }
  }

  for (const columnTasks of Object.values(grouped)) {
    columnTasks.sort(sortByPosition);
  }

  return grouped;
}, [filteredTasks]);

  // In List view, group by status and then preserve each column's position order.
  const listTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const statusOrderA = columns.findIndex((column) => column.id === a.status);
      const statusOrderB = columns.findIndex((column) => column.id === b.status);

      if (statusOrderA !== statusOrderB) {
        return statusOrderA - statusOrderB;
      }

      return sortByPosition(a, b);
    });
  }, [filteredTasks]);

  // Generate a Monday-first calendar grid for the currently displayed month.
  // Empty cells before/after the month keep every date aligned under its weekday.
  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const leadingEmptyCells = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array(leadingEmptyCells).fill(null);

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [calendarMonth]);

  // Group the already-filtered tasks by due date. Board, List, and Calendar
  // all work from the same task data and therefore share the same filters.
  const calendarTasksByDate = useMemo(() => {
    const grouped = {};

    for (const task of filteredTasks) {
      const dueDate = parseCalendarDate(task.dueDate);
      if (!dueDate) continue;

      const dateKey = getCalendarDateKey(dueDate);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(task);
    }

    return grouped;
  }, [filteredTasks]);

  // Tasks without a valid due date cannot appear in a date cell, so list them
  // separately rather than hiding them from the Calendar view.
  const unscheduledTasks = useMemo(
    () => filteredTasks.filter((task) => !parseCalendarDate(task.dueDate)),
    [filteredTasks]
  );

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
    // Positions are calculated from the full task list, so do not reorder while filtering.
    if (hasActiveFilters || !over || movingTaskId) return;
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

  useEffect(() => {
  const controller = new AbortController();

  const fetchWorkspaceRole = async () => {
    setWorkspaceRoleLoading(true);

    try {
      const response = await api.get(
        `/workspaces/${workspaceId}`,
        { signal: controller.signal }
      );

      if (!controller.signal.aborted) {
        setWorkspaceRole(
          response.data.workspace.role ?? null
        );
      }
    } catch {
      if (!controller.signal.aborted) {
        setWorkspaceRole(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setWorkspaceRoleLoading(false);
      }
    }
  };

  void fetchWorkspaceRole();

  return () => {
    controller.abort();
  };
}, [workspaceId]);

useEffect(() => {
  const controller = new AbortController();

  const loadWorkspaceMembers = async () => {
    setWorkspaceMembersLoading(true);
    setWorkspaceMembersError("");

    try {
      const response = await api.get(
        `/workspaces/${workspaceId}/members`,
        { signal: controller.signal }
      );

      if (!controller.signal.aborted) {
        setWorkspaceMembers(response.data.members || []);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setWorkspaceMembersError(
          err.response?.data?.message ||
            "Unable to load workspace members."
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setWorkspaceMembersLoading(false);
      }
    }
  };

  void loadWorkspaceMembers();

  return () => controller.abort();
}, [workspaceId]);

  const activeTask = tasks.find(
    (task) => task._id === activeTaskId
  );

  if (loading || workspaceRoleLoading) {
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

      {/* Task views */}
      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {viewMode === "board"
                ? "Board view"
                : viewMode === "list"
                  ? "List view"
                  : "Calendar view"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {viewMode === "board"
                ? hasActiveFilters
                  ? "Clear filters to safely drag and reorder tasks."
                  : "Drag tasks between columns or reorder them."
                : viewMode === "list"
                  ? "Review task details in a compact list grouped by status."
                  : "See tasks on their due dates and open any task for details."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-500">
              {hasActiveFilters
                ? `${filteredTasks.length} of ${tasks.length} tasks`
                : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`}
            </span>

            <div
              className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
              role="group"
              aria-label="Task view"
            >
              <button
                type="button"
                aria-pressed={viewMode === "board"}
                onClick={() => setViewMode("board")}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  viewMode === "board"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid size={16} />
                Board
              </button>

              <button
                type="button"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  viewMode === "list"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List size={16} />
                List
              </button>

              <button
                type="button"
                aria-pressed={viewMode === "calendar"}
                onClick={() => setViewMode("calendar")}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  viewMode === "calendar"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CalendarDays size={16} />
                Calendar
              </button>
            </div>

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

        {/* Search and filters are shared by Board, List, and Calendar views. */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2 xl:col-span-1">
              Search tasks
              <div className="relative mt-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Title or description..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </label>

            <label className="block text-xs font-semibold text-slate-600">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">All statuses</option>
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-600">
              Priority
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">All priorities</option>
                {priorities.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-600">
              Assignee
              <select
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
                disabled={workspaceMembersLoading || workspaceMembers.length === 0}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="">All assignees</option>
                {workspaceMembers.map((member) => (
                  <option key={member.userId} value={String(member.userId)}>
                    {member.username || member.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-600">
              Due date
              <select
                value={dueDateFilter}
                onChange={(event) => setDueDateFilter(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Any due date</option>
                <option value="overdue">Overdue</option>
                <option value="next_7_days">Due in next 7 days</option>
                <option value="no_date">No due date</option>
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500" role="status">
              {workspaceMembersError ||
                "Combine search and filters to narrow your tasks."}
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("");
                  setPriorityFilter("");
                  setAssigneeFilter("");
                  setDueDateFilter("");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
              >
                <X size={15} />
                Clear filters
              </button>
            )}
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
            <p className="text-sm text-amber-800">{refreshError}</p>
            <button
              type="button"
              onClick={refreshTasks}
              className="text-sm font-semibold text-amber-800 underline"
            >
              Retry
            </button>
          </div>
        )}

        {filteredTasks.length === 0 ? (
          <div
            role="status"
            className="rounded-xl border border-slate-200 bg-white p-8 text-center"
          >
            <p className="font-semibold text-slate-800">
              {tasks.length === 0
                ? "No tasks in this project yet."
                : "No tasks match your current search and filters."}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {tasks.length === 0
                ? "Create a task to get started."
                : "Try changing your search or clearing the filters."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("");
                  setPriorityFilter("");
                  setAssigneeFilter("");
                  setDueDateFilter("");
                }}
                className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : viewMode === "board" ? (
          <DndContext
            sensors={hasActiveFilters ? [] : sensors}
            collisionDetection={kanbanCollisionDetection}
            onDragStart={({ active }) => {
              // Reordering while filtered would use incorrect visible positions.
              if (!hasActiveFilters) {
                setActiveTaskId(String(active.id));
              }
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
                  onOpenTask={setSelectedTask}
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
        ) : viewMode === "list" ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Task
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Priority
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Assignee
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Due date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listTasks.map((task) => {
                    const statusColumn = columns.find(
                      (column) => column.id === task.status
                    );
                    const priority = priorities.find(
                      (item) => item.value === task.priority
                    );
                    const dueDate = parseCalendarDate(task.dueDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    dueDate?.setHours(0, 0, 0, 0);
                    const isOverdue = Boolean(
                      dueDate && dueDate < today && task.status !== "done"
                    );

                    return (
                      <tr
                        key={task._id}
                        className="cursor-pointer transition hover:bg-indigo-50/50 focus-within:bg-indigo-50/50"
                        onClick={() => setSelectedTask(task)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedTask(task);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`Open task ${task.title}`}
                      >
                        <td className="px-5 py-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="mt-1 max-w-md truncate text-sm text-slate-500">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                              statusStyles[task.status] || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {statusColumn?.title || task.status || "Unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                              priorityStyles[task.priority] || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {priority?.label || task.priority || "Not set"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {getAssigneeName(task.assignee, workspaceMembers)}
                        </td>
                        <td className={`whitespace-nowrap px-4 py-4 text-sm ${isOverdue ? "font-semibold text-red-600" : "text-slate-600"}`}>
                          {formatDueDate(task.dueDate)}
                          {isOverdue && (
                            <span className="ml-2 text-xs">Overdue</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              Select a task row to open its details and discussion.
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {calendarMonth.toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Tasks with due dates appear on their scheduled day. Select a task to open it.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      (current) =>
                        new Date(current.getFullYear(), current.getMonth() - 1, 1)
                    )
                  }
                  aria-label="Previous month"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setCalendarMonth(
                      new Date(today.getFullYear(), today.getMonth(), 1)
                    );
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      (current) =>
                        new Date(current.getFullYear(), current.getMonth() + 1, 1)
                    )
                  }
                  aria-label="Next month"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[840px]">
                <div className="grid grid-cols-7 border-l border-t border-slate-200">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (weekday) => (
                      <div
                        key={weekday}
                        className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {weekday}
                      </div>
                    )
                  )}

                  {calendarCells.map((date, index) => {
                    if (!date) {
                      return (
                        <div
                          key={`empty-${index}`}
                          aria-hidden="true"
                          className="min-h-[135px] border-b border-r border-slate-200 bg-slate-50/60"
                        />
                      );
                    }

                    const dateKey = getCalendarDateKey(date);
                    const dayTasks = calendarTasksByDate[dateKey] || [];
                    const today = getCalendarDateKey(new Date()) === dateKey;

                    return (
                      <div
                        key={dateKey}
                        className="min-h-[135px] border-b border-r border-slate-200 bg-white p-2"
                      >
                        <div className="mb-2 flex items-center justify-between gap-1">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                              today
                                ? "bg-indigo-600 font-bold text-white"
                                : "font-medium text-slate-700"
                            }`}
                          >
                            {date.getDate()}
                          </span>
                          {dayTasks.length > 0 && (
                            <span className="text-[11px] text-slate-400">
                              {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          {dayTasks
                            .slice(
                              0,
                              expandedCalendarDate === dateKey ? dayTasks.length : 3
                            )
                            .map((task) => (
                            <button
                              key={task._id}
                              type="button"
                              onClick={() => setSelectedTask(task)}
                              title={`${task.title} — ${formatDueDate(task.dueDate)}`}
                              className={`block w-full truncate rounded-md px-2 py-1 text-left text-xs font-medium transition hover:ring-1 hover:ring-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                statusStyles[task.status] || "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {task.title}
                            </button>
                          ))}

                          {dayTasks.length > 3 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCalendarDate((current) =>
                                  current === dateKey ? null : dateKey
                                )
                              }
                              aria-label={
                                expandedCalendarDate === dateKey
                                  ? `Show fewer tasks for ${formatDueDate(date)}`
                                  : `Show all ${dayTasks.length} tasks for ${formatDueDate(date)}`
                              }
                              className="px-1 text-left text-xs font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none focus:underline"
                            >
                              {expandedCalendarDate === dateKey
                                ? "Show less"
                                : `+${dayTasks.length - 3} more`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <section className="border-t border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-900">Unscheduled tasks</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    These tasks have no valid due date, so they cannot be placed on a calendar day.
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  {unscheduledTasks.length}
                </span>
              </div>

              {unscheduledTasks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                  No unscheduled tasks match your current search and filters.
                </p>
              ) : (
                <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {unscheduledTasks.map((task) => {
                    const statusColumn = columns.find(
                      (column) => column.id === task.status
                    );
                    const priority = priorities.find(
                      (item) => item.value === task.priority
                    );

                    return (
                      <button
                        key={task._id}
                        type="button"
                        onClick={() => setSelectedTask(task)}
                        className="flex w-full flex-col gap-3 px-4 py-3 text-left transition hover:bg-indigo-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="mt-1 block truncate text-sm text-slate-500">
                              {task.description}
                            </span>
                          )}
                        </span>

                        <span className="flex shrink-0 flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              statusStyles[task.status] || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {statusColumn?.title || task.status || "Unknown"}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              priorityStyles[task.priority] || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {priority?.label || task.priority || "Not set"}
                          </span>
                          <span className="text-xs text-slate-500">
                            {getAssigneeName(task.assignee, workspaceMembers)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </section>

      {showCreateTaskModal && (
        <CreateTaskModal
          workspaceId={workspaceId}
          projectId={projectId}
          onClose={() => setShowCreateTaskModal(false)}
          onCreated={refreshTasks}
        />
      )}
      {selectedTask && (
        <TaskDetailsModal
          key={selectedTask._id}
          task={selectedTask}
          workspaceId={workspaceId}
          projectId={projectId}
          onClose={() => setSelectedTask(null)}
          onUpdated={refreshTasks}
          workspaceRole={workspaceRole}
        />
      )}
    </main>
  );
}
export default ProjectPage;