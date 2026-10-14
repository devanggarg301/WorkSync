
import { Link } from "react-router-dom";
import { ArrowUpRight, FolderKanban } from "lucide-react";

function ProjectCard({ project, workspaceId }) {
  return (
    <Link
      to={`/workspaces/${workspaceId}/projects/${project._id}`}
      className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <FolderKanban size={22} />
        </div>

        <ArrowUpRight
          size={20}
          className="text-slate-400 group-hover:text-indigo-600"
        />
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900">
          {project.name}
        </h3>

        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
          {project.key}
        </span>
      </div>

      <p className="mt-2 text-sm leading-5 text-slate-500">
        {project.description || "No description provided."}
      </p>

      {project.createdBy && (
        <p className="mt-4 text-xs text-slate-400">
          Created by {project.createdBy.username}
        </p>
      )}
    </Link>
  );
}

export default ProjectCard;
