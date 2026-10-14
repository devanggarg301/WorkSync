
import { Link } from "react-router-dom";
import { ArrowUpRight, FolderKanban } from "lucide-react";

function WorkspaceCard({ workspace }) {
  return (
    <Link
      to={`/workspaces/${workspace._id}`}
      className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <FolderKanban size={22} />
        </div>

        <ArrowUpRight
          size={20}
          className="text-slate-400 transition group-hover:text-indigo-600"
        />
      </div>

      <h2 className="mt-4 font-semibold text-slate-900">
        {workspace.name}
      </h2>

      <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">
        {workspace.description || "No description provided."}
      </p>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium capitalize text-indigo-700">
          {workspace.role}
        </span>
      </div>
    </Link>
  );
}

export default WorkspaceCard;