import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import TaskCard from "./TaskCard";

function SortableTaskCard({ task, disabled = false,onOpen }) {
  const {attributes,listeners,setNodeRef,transform,transition,isDragging,} = useSortable({
    id: task._id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:cursor-grabbing"
    >
      <TaskCard task={task} onOpen={onOpen} />
    </div>
  );
}

export default SortableTaskCard;