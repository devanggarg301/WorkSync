import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  CirclePlus,
  Flag,
  GripVertical,
  MessageCircle,
  Pencil,
  RefreshCw,
  UserRound,
} from "lucide-react";

import api from "../api/client";

const activityIcons = {
  task_created: CirclePlus,
  task_updated: Pencil,
  status_changed: ArrowRightLeft,
  priority_changed: Flag,
  assignee_changed: UserRound,
  task_reordered: GripVertical,
  comment_added: MessageCircle,
};

function formatActivityDate(date) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown date";
  }

  return parsedDate.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function TaskActivityTimeline({
  workspaceId,
  projectId,
  taskId,
  refreshToken = 0,
}) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const loadActivity = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/activity`,
          { signal: controller.signal }
        );

        if (!controller.signal.aborted) {
          setActivities(response.data.activities);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.response?.data?.message ||
              "Unable to load task activity."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadActivity();

    return () => {
      controller.abort();
    };
  }, [workspaceId, projectId, taskId, refreshToken, retryCount]);

  return (
    <section className="mt-6 border-t border-slate-200 pt-6">
      <div className="flex items-center gap-2">
        <Activity size={19} className="text-slate-500" />

        <h3 className="text-base font-semibold text-slate-900">
          Activity
        </h3>

        {!loading && !error && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {activities.length}
          </span>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">
          Loading activity...
        </p>
      ) : error ? (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3"
        >
          <p className="text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-red-700"
          >
            <RefreshCw size={13} />
            Retry
          </button>
        </div>
      ) : activities.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-7 text-center">
          <Activity
            size={24}
            className="mx-auto text-slate-400"
          />

          <p className="mt-2 text-sm font-medium text-slate-700">
            No activity yet
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Task updates and other actions will appear here.
          </p>
        </div>
      ) : (
        <ol className="mt-5 space-y-5">
          {activities.map((item, index) => {
            const Icon = activityIcons[item.action] || Activity;

            const actorName =
              item.actorId?.username || "Former member";

            return (
              <li
                key={item._id}
                className="relative flex gap-3"
              >
                <div className="relative flex flex-col items-center">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Icon size={16} />
                  </div>

                  {index < activities.length - 1 && (
                    <div className="absolute top-10 bottom-[-12px] w-px bg-slate-200" />
                  )}
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-sm leading-6 text-slate-700">
                    <span className="font-semibold text-slate-900">
                      {actorName}
                    </span>{" "}
                    {item.message}
                  </p>

                  <time
                    dateTime={item.createdAt}
                    className="mt-1 block text-xs text-slate-400"
                  >
                    {formatActivityDate(item.createdAt)}
                  </time>

                  {item.action === "task_updated" &&
                    item.metadata?.changedFields?.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Updated:{" "}
                        {item.metadata.changedFields.join(", ")}
                      </p>
                    )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default TaskActivityTimeline;