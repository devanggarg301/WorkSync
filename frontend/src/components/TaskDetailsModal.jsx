import { useEffect, useState } from "react";
import { X } from "lucide-react";
import api from "../api/client";
import TaskComments from "./TaskComments";

const statuses = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function getAssigneeId(assignee) {
  if (!assignee) return "";
  return typeof assignee === "string" ? assignee : assignee._id;
}

function getDateInputValue(date) {
  if (!date) return "";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return parsedDate.toISOString().slice(0, 10);
}

function TaskDetailsModal({task,workspaceId,projectId,onClose,onUpdated,}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(
    task.description || ""
  );
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(
    getAssigneeId(task.assignee)
  );
  const [dueDate, setDueDate] = useState(
    getDateInputValue(task.dueDate)
  );
  const [labelsInput, setLabelsInput] = useState(
    (task.labels || []).join(", ")
  );

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadMembers = async () => {
      try {
        const response = await api.get(
          `/workspaces/${workspaceId}/members`
        );

        if (active) {
          setMembers(response.data.members);
        }
      } catch {
        if (active) {
          setMembersError("Unable to load workspace members.");
        }
      } finally {
        if (active) {
          setMembersLoading(false);
        }
      }
    };

    loadMembers();

    return () => {
      active = false;
    };
  }, [workspaceId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const labels = labelsInput
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);

    if (labels.length > 10 || labels.some((label) => label.length > 30)) {
      setError("Use at most 10 labels, each no longer than 30 characters.");
      return;
    }

    const updates = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assigneeId: assigneeId || null,
      dueDate: dueDate
        ? `${dueDate}T00:00:00.000Z`
        : null,
      labels,
    };

    setSaving(true);

    try {
      await api.patch(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${task._id}`,
        updates
      );

      await onUpdated();
      onClose();
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.errors?.join(", ") ||
          data?.message ||
          "Unable to update task. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-details-title"
        className="my-8 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="task-details-title"
              className="text-xl font-bold text-slate-900"
            >
              Task details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Edit task information and assignment.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Task ID: {task._id}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {membersError && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            {membersError} The existing assignment will be preserved.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <label
              htmlFor="details-title"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Title
            </label>

            <input
              id="details-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              minLength={2}
              maxLength={200}
              required
              disabled={saving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label
              htmlFor="details-description"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Description
            </label>

            <textarea
              id="details-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={5000}
              rows={4}
              disabled={saving}
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="details-status"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Status
              </label>

              <select
                id="details-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
              >
                {statuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="details-priority"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Priority
              </label>

              <select
                id="details-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
              >
                {priorities.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="details-assignee"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Assignee
              </label>

              <select
                id="details-assignee"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                disabled={saving || membersLoading || Boolean(membersError)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 disabled:bg-slate-50"
              >
                <option value="">Unassigned</option>

                {assigneeId &&
                  !members.some((member) => member.userId === assigneeId) && (
                    <option value={assigneeId}>
                      Current assignee
                    </option>
                  )}

                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.username} ({member.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="details-due-date"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Due date
              </label>

              <input
                id="details-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="details-labels"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Labels
            </label>

            <input
              id="details-labels"
              value={labelsInput}
              onChange={(event) => setLabelsInput(event.target.value)}
              disabled={saving}
              placeholder="frontend, bug, documentation"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500"
            />

            <p className="mt-1 text-xs text-slate-500">
              Separate labels with commas; maximum 10 labels.
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
        <TaskComments workspaceId={workspaceId} projectId={projectId} taskId={task._id} />
      </section>
    </div>
  );
}

export default TaskDetailsModal;