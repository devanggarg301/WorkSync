
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FolderPlus, Plus } from "lucide-react";

import api from "../api/client";
import ProjectCard from "../components/ProjectCard";
import CreateProjectModal from "../components/CreateProjectModal";

function WorkspacePage() {
  const { workspaceId } = useParams();

  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadWorkspaceData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [workspaceResponse, projectsResponse] =
        await Promise.all([
          api.get(`/workspaces/${workspaceId}`),
          api.get(`/workspaces/${workspaceId}/projects`),
        ]);

      setWorkspace(workspaceResponse.data.workspace);
      setProjects(projectsResponse.data.projects);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load this workspace."
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-36 animate-pulse rounded-xl bg-white" />
      </main>
    );
  }

  if (error || !workspace) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <p
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error || "Workspace not found."}
        </p>

        <button
          type="button"
          onClick={loadWorkspaceData}
          className="mt-4 text-sm font-semibold text-indigo-600"
        >
          Retry
        </button>
      </main>
    );
  }

  const canCreateProject = ["owner", "admin"].includes(
    workspace.role
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:py-12">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
      >
        <ArrowLeft size={16} />
        All workspaces
      </Link>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">
              Workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {workspace.name}
            </h1>

            <p className="mt-3 max-w-2xl leading-6 text-slate-500">
              {workspace.description || "No description provided."}
            </p>
          </div>

          <span className="self-start rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium capitalize text-indigo-700">
            {workspace.role}
          </span>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Projects
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage and track work within this workspace.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {projects.length}{" "}
              {projects.length === 1 ? "project" : "projects"}
            </span>

            {canCreateProject && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <Plus size={17} />
                Create project
              </button>
            )}
          </div>
        </div>

        {projects.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                workspaceId={workspaceId}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <FolderPlus size={30} className="text-slate-400" />

            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No projects yet
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Create your first project to start organizing tasks
              and collaborating with your team.
            </p>

            {canCreateProject && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Create project
              </button>
            )}
          </div>
        )}
      </section>

      {showCreateModal && (
        <CreateProjectModal
          workspaceId={workspaceId}
          onClose={() => setShowCreateModal(false)}
          onCreated={loadWorkspaceData}
        />
      )}
    </main>
  );
}

export default WorkspacePage;
