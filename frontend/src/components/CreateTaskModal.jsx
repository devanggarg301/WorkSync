
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import api from "../api/client";

function CreateTaskModal({ workspaceId, projectId, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [labelsInput, setLabelsInput] = useState("");

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
      labels,
    };

    setSubmitting(true);

    try {
      await api.post(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
        taskData
      );

      await onCreated();
      onClose();
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.errors?.join(", ") ||
          data?.message ||
          "Unable to create task. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
        className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="create-task-title"
              className="text-xl font-bold text-slate-900"
            >
              Create a task
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add a task to this project's board.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close dialog"
            disabled={submitting}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="task-title"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Task title
            </label>

            <input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              minLength={2}
              maxLength={200}
              required
              autoFocus
              placeholder="e.g. Build login page"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label
              htmlFor="task-description"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Description
            </label>

            <textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={5000}
              rows={3}
              placeholder="Describe what needs to be done..."
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="task-status"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Status
              </label>

              <select
                id="task-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-500"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="task-priority"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Priority
              </label>

              <select
                id="task-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="task-assignee"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Assignee
              </label>

              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                disabled={membersLoading || Boolean(membersError)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-500 disabled:bg-slate-50"
              >
                <option value="">Unassigned</option>

                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.username} ({member.role})
                  </option>
                ))}
              </select>

              {membersError && (
                <p className="mt-1 text-xs text-amber-700">
                  {membersError} You can still create an unassigned task.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="task-due-date"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Due date
              </label>

              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="task-labels"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Labels
            </label>

            <input
              id="task-labels"
              value={labelsInput}
              onChange={(event) => setLabelsInput(event.target.value)}
              placeholder="frontend, bug, ui"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500"
            />

            <p className="mt-1 text-xs text-slate-500">
              Separate labels with commas. Maximum 10 labels.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create task"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CreateTaskModal;
