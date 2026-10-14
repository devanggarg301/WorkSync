
import { useState } from "react";
import { X } from "lucide-react";
import api from "../api/client";

function suggestProjectKey(name) {
  const words = name.toUpperCase().match(/[A-Z][A-Z0-9]*/g) || [];

  if (words.length > 1) {
    return words.map((word) => word[0]).join("").slice(0, 10);
  }

  return (words[0] || "").slice(0, 4);
}

function CreateProjectModal({
  workspaceId,
  onClose,
  onCreated,
}) {
  const [name, setName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleNameChange = (value) => {
    setName(value);

    if (!keyEdited) {
      setProjectKey(suggestProjectKey(value));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await api.post(`/workspaces/${workspaceId}/projects`, {
        name: name.trim(),
        key: projectKey.trim().toUpperCase(),
        description: description.trim(),
      });

      await onCreated();
      onClose();
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.errors?.join(", ") ||
          data?.message ||
          "Unable to create project. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
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
        aria-labelledby="create-project-title"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="create-project-title"
              className="text-xl font-bold text-slate-900"
            >
              Create a project
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Organize a new stream of work in this workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close dialog"
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
              htmlFor="project-name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Project name
            </label>

            <input
              id="project-name"
              value={name}
              onChange={(event) =>
                handleNameChange(event.target.value)
              }
              minLength={2}
              maxLength={100}
              required
              autoFocus
              placeholder="e.g. Website Redesign"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label
              htmlFor="project-key"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Project key
            </label>

            <input
              id="project-key"
              value={projectKey}
              onChange={(event) => {
                setKeyEdited(true);
                setProjectKey(event.target.value.toUpperCase());
              }}
              minLength={2}
              maxLength={10}
              pattern="[A-Z][A-Z0-9]{1,9}"
              required
              placeholder="e.g. WEB"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />

            <p className="mt-1 text-xs text-slate-500">
              Start with a letter; use 2–10 letters or numbers.
              Used later in task references such as WEB-1.
            </p>
          </div>

          <div>
            <label
              htmlFor="project-description"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Description (optional)
            </label>

            <textarea
              id="project-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              maxLength={1000}
              rows={3}
              placeholder="What will this project accomplish?"
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
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
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CreateProjectModal;
