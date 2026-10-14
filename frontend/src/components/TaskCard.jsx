
import { CalendarDays, UserRound } from "lucide-react";

const priorityStyles = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

function TaskCard({ task, onOpen }) {
  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString()
    : null;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-indigo-200">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-5 text-slate-900">
          <button
            type="button"
            onClick={onOpen}
            className="text-left text-sm font-semibold leading-5 text-slate-900 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
            {task.title}
          </button>
        </p>

        <span
          className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold uppercase ${
            priorityStyles[task.priority] || priorityStyles.medium
          }`}
        >
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
          {task.description}
        </p>
      )}

      {task.labels?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.labels.map((label) => (
            <span
              key={label}
              className="rounded bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <UserRound size={14} />
          {task.assignee?.username || "Unassigned"}
        </span>

        {formattedDueDate && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <CalendarDays size={13} />
            {formattedDueDate}
          </span>
        )}
      </div>
    </article>
  );
}

export default TaskCard;
