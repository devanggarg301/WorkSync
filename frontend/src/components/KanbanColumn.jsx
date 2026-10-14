
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";

import SortableTaskCard from "./SortableTaskCard";

function KanbanColumn({ column, tasks, movingTaskId }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: {
      type: "column",
      status: column.id,
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-80 min-w-0 flex-col rounded-xl border p-3 transition-colors ${
        isOver
          ? "border-indigo-400 bg-indigo-50/70"
          : "border-transparent bg-slate-100/80"
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-1 py-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {column.title}
        </h3>

        <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-white px-1.5 text-xs font-medium text-slate-500">
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map((task) => task._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="mt-2 flex flex-1 flex-col gap-3">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task._id}
              task={task}
              disabled={Boolean(movingTaskId)}
            />
          ))}

          {tasks.length === 0 && (
            <div className="flex min-h-24 flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 px-3 text-center text-xs text-slate-400">
              Drop tasks here
            </div>
          )}

          {tasks.length > 0 && (
            <div className="min-h-8 flex-1 rounded-lg" />
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export default KanbanColumn;
