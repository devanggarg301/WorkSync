import { useEffect, useState } from "react";
import {MessageCircle,Send,Pencil,Trash2,} from "lucide-react";
import { createPortal } from "react-dom";

import { useAuth } from "../context/AuthContext";
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

function TaskComments({workspaceId,projectId,taskId,onCommentAdded,}) {
  const { user } = useAuth();
  const currentUserId = user?._id;

  const [workspaceRole, setWorkspaceRole] = useState(null);

  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingBody, setEditingBody] = useState("");
  const [savingCommentId, setSavingCommentId] = useState(null);

  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

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

    void loadComments();

    return () => {
      controller.abort();
    };
  }, [workspaceId, projectId, taskId]);

  useEffect(() => {
    if (!currentUserId) {
      setWorkspaceRole(null);
      return;
    }

    const controller = new AbortController();

    setWorkspaceRole(null);

    const loadWorkspaceRole = async () => {
      try {
        const response = await api.get(
          `/workspaces/${workspaceId}/members`,
          { signal: controller.signal }
        );

        const currentMember = response.data.members.find(
          (member) =>
            String(member.userId?._id ?? member.userId) ===
            String(currentUserId)
        );

        if (!controller.signal.aborted) {
          setWorkspaceRole(currentMember?.role ?? "member");
        }
      } catch {
        if (!controller.signal.aborted) {
          setWorkspaceRole("member");
        }
      }
    };

    void loadWorkspaceRole();

    return () => {
      controller.abort();
    };
  }, [workspaceId, currentUserId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedBody = body.trim();

    if (!trimmedBody || submitting || loading) {
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
      onCommentAdded?.();
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
  const handleStartEdit = (comment) => {
    setEditingCommentId(comment._id);
    setEditingBody(comment.body);
    setError("");
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingBody("");
    setError("");
  };

  const handleSaveEdit = async (event, commentId) => {
    event.preventDefault();

    const trimmedBody = editingBody.trim();

    if (!trimmedBody) {
      setError("Comment cannot be empty.");
      return;
    }

    if (trimmedBody.length > 3000 || savingCommentId) {
      return;
    }

    setSavingCommentId(commentId);
    setError("");

    try {
      const response = await api.patch(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
        { body: trimmedBody }
      );

      setComments((currentComments) =>
        currentComments.map((comment) =>
          comment._id === commentId
            ? response.data.comment
            : comment
        )
      );

      setEditingCommentId(null);
      setEditingBody("");

      onCommentAdded?.();
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.errors?.join(", ") ||
          data?.message ||
          "Unable to update comment. Please try again."
      );
    } finally {
      setSavingCommentId(null);
    }
  };

  const handleStartDelete = (comment) => {
    setDeleteError("");
    setCommentToDelete(comment);
  };

  const handleCancelDelete = () => {
    if (deletingCommentId) return;

    setCommentToDelete(null);
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    if (!commentToDelete || deletingCommentId) {
      return;
    }

    const commentId = commentToDelete._id;

    setDeletingCommentId(commentId);
    setDeleteError("");

    try {
      await api.delete(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`
      );

      setComments((currentComments) =>
        currentComments.filter(
          (comment) => comment._id !== commentId
        )
      );

      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingBody("");
      }

      setCommentToDelete(null);

      onCommentAdded?.();
    } catch (err) {
      const data = err.response?.data;

      setDeleteError(
        data?.errors?.join(", ") ||
          data?.message ||
          "Unable to delete comment. Please try again."
      );
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <section className="mt-6 border-t border-slate-200 pt-6">
      {/* Discussion heading */}
      <div className="flex items-center gap-2">
        <MessageCircle
          size={19}
          className="text-slate-500"
        />

        <h3 className="text-base font-semibold text-slate-900">
          Discussion
        </h3>

        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {comments.length}
        </span>
      </div>

      {/* General comment or API errors */}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Comment list */}
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
            const username =
              author?.username || "Former member";

            const isAuthor = Boolean(
              currentUserId &&
                author?._id &&
                String(author._id) === String(currentUserId)
            );

            const canDelete =
              isAuthor ||
              workspaceRole === "owner" ||
              workspaceRole === "admin";

            const isEditing =
              editingCommentId === comment._id;

            const isSaving =
              savingCommentId === comment._id;

            const wasEdited =
              comment.createdAt &&
              comment.updatedAt &&
              new Date(comment.updatedAt).getTime() >
                new Date(comment.createdAt).getTime();

            return (
              <article
                key={comment._id}
                className="flex items-start gap-3"
              >
                {/* Author avatar */}
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
                  {/* Author and comment date */}
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

                    {wasEdited && (
                      <span className="text-xs text-slate-400">
                        (edited)
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    /* Inline comment editor */
                    <form
                      onSubmit={(event) =>
                        handleSaveEdit(event, comment._id)
                      }
                      className="mt-3 space-y-2"
                    >
                      <textarea
                        value={editingBody}
                        onChange={(event) =>
                          setEditingBody(event.target.value)
                        }
                        maxLength={3000}
                        rows={3}
                        required
                        disabled={isSaving}
                        aria-label="Edit comment"
                        className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                      />

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={
                            !editingBody.trim() ||
                            isSaving
                          }
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {/* Normal comment text */}
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                        {comment.body}
                      </p>

                      {/* Edit and Delete actions */}
                      {(isAuthor || canDelete) && (
                        <div className="mt-2 flex items-center gap-3">
                          {isAuthor && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStartEdit(comment)
                              }
                              disabled={Boolean(
                                savingCommentId ||
                                  deletingCommentId
                              )}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil size={13} />
                              Edit
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStartDelete(comment)
                              }
                              disabled={Boolean(
                                savingCommentId ||
                                  deletingCommentId
                              )}
                              className="inline-flex items-center gap-1 text-xs font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Add a comment */}
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
            disabled={
              submitting ||
              !body.trim() ||
              loading
            }
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={15} />
            {submitting ? "Posting..." : "Post comment"}
          </button>
        </div>
      </form>

      {/* In-app deletion confirmation */}
      {commentToDelete &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center bg-slate-950/60 p-4"
            style={{ zIndex: 9999 }}
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !deletingCommentId
              ) {
                handleCancelDelete();
              }
            }}
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-comment-title"
              aria-describedby="delete-comment-description"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 size={22} />
              </div>

              <h3
                id="delete-comment-title"
                className="mt-4 text-lg font-bold text-slate-900"
              >
                Delete this comment?
              </h3>

              <p
                id="delete-comment-description"
                className="mt-2 text-sm leading-6 text-slate-600"
              >
                This comment will be permanently deleted:
                <span className="mt-2 block whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3">
                  {commentToDelete.body}
                </span>
              </p>

              {deleteError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                  {deleteError}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={
                    deletingCommentId === commentToDelete._id
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={
                    deletingCommentId === commentToDelete._id
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <Trash2 size={16} />

                  {deletingCommentId === commentToDelete._id
                    ? "Deleting..."
                    : "Delete comment"}
                </button>
              </div>
            </section>
          </div>,
          document.body
        )}
    </section>
  );
}

export default TaskComments;