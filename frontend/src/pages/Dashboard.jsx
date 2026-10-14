
import { useCallback, useEffect, useState } from "react";
import { FolderPlus, Plus } from "lucide-react";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

import WorkspaceCard from "../components/WorkspaceCard";
import CreateWorkspaceModal from "../components/CreateWorkspaceModal";

function Dashboard() {
  const { user } = useAuth();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/workspaces");
      setWorkspaces(response.data.workspaces);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load workspaces. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleWorkspaceCreated = () => {
    loadWorkspaces();
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:py-12">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            YOUR WORKSPACES
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.username}
          </h1>

          <p className="mt-2 text-slate-500">
            Organize your projects and collaborate with your team.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:self-auto"
        >
          <Plus size={18} />
          Create workspace
        </button>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            All workspaces
          </h2>

          {!loading && (
            <span className="text-sm text-slate-500">
              {workspaces.length}{" "}
              {workspaces.length === 1 ? "workspace" : "workspaces"}
            </span>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-red-700">{error}</p>

            <button
              type="button"
              onClick={loadWorkspaces}
              className="self-start text-sm font-semibold text-red-700 underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : workspaces.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace._id}
                workspace={workspace}
              />
            ))}
          </div>
        ) : (
          !error && (
            <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <FolderPlus size={28} />
              </div>

              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Create your first workspace
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Workspaces bring your team, projects, and tasks
                together in one place.
              </p>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Create workspace
              </button>
            </div>
          )
        )}
      </section>

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleWorkspaceCreated}
        />
      )}
    </main>
  );
}

export default Dashboard;
