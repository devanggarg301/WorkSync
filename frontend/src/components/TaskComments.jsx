import { useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

import api from "../api/client";

function formatCommentDate(date) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown date";
  }

  return parsedDate.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function TaskComments({ workspaceId, projectId, taskId }) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadComments = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
          { signal: controller.signal }
        );

        if (!controller.signal.aborted) {
          setComments(response.data.comments);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.response?.data?.message ||
              "Unable to load comments."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadComments();

    return () => {
      controller.abort();
    };
  }, [workspaceId, projectId, taskId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedBody = body.trim();

    if (!trimmedBody || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await api.post(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
        { body: trimmedBody }
      );

      setComments((currentComments) => [
        ...currentComments,
        response.data.comment,
      ]);

      setBody("");
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.errors?.join(", ") ||
          data?.message ||
          "Unable to post comment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-6 border-t border-slate-200 pt-6">
      <div className="flex items-center gap-2">
        <MessageCircle size={19} className="text-slate-500" />

        <h3 className="text-base font-semibold text-slate-900">
          Discussion
        </h3>

        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {comments.length}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="mt-4 max-h-64 space-y-4 overflow-y-auto pr-1">
        {loading ? (
          <p className="py-4 text-sm text-slate-500">
            Loading comments...
          </p>
        ) : comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-7 text-center">
            <MessageCircle
              size={24}
              className="mx-auto text-slate-400"
            />

            <p className="mt-2 text-sm font-medium text-slate-700">
              No comments yet
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Start the conversation about this task.
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const author = comment.authorId;
            const username = author?.username || "Former member";

            return (
              <article
                key={comment._id}
                className="flex items-start gap-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                  {author?.avatarUrl ? (
                    <img
                      src={author.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    username.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-slate-900">
                      {username}
                    </span>

                    <time
                      dateTime={comment.createdAt}
                      className="text-xs text-slate-400"
                    >
                      {formatCommentDate(comment.createdAt)}
                    </time>
                  </div>

                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                    {comment.body}
                  </p>
                </div>
              </article>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-5">
        <label
          htmlFor={`comment-${taskId}`}
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Add a comment
        </label>

        <textarea
          id={`comment-${taskId}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={3000}
          rows={3}
          placeholder="Share an update or ask a question..."
          disabled={submitting}
          className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {body.length}/3000 characters
          </span>

          <button
            type="submit"
            disabled={submitting || !body.trim() || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={15} />
            {submitting ? "Posting..." : "Post comment"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default TaskComments;