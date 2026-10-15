
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

  // Workspace members
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState("");

  // Add-member form
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberSuccess, setMemberSuccess] = useState("");

  // Active workspace tab
  const [activeTab, setActiveTab] = useState("projects");

  // Load workspace details and projects.
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

  // Load the workspace's members.
  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError("");

    try {
      const response = await api.get(
        `/workspaces/${workspaceId}/members`
      );

      setMembers(response.data.members);
    } catch (err) {
      setMembersError(
        err.response?.data?.message ||
          "Unable to load workspace members."
      );
    } finally {
      setMembersLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  // Add an existing WorkSync user to this workspace.
  const handleAddMember = async (event) => {
    event.preventDefault();

    const email = memberEmail.trim().toLowerCase();

    if (!email || addingMember) return;

    setAddingMember(true);
    setMembersError("");
    setMemberSuccess("");

    try {
      const response = await api.post(
        `/workspaces/${workspaceId}/members`,
        { email }
      );

      const newMember = response.data.member;

      setMembers((currentMembers) => [
        ...currentMembers,
        newMember,
      ]);

      setMemberEmail("");
      setMemberSuccess(
        response.data.message ||
          "Member added successfully."
      );
    } catch (err) {
      setMembersError(
        err.response?.data?.message ||
          "Unable to add this member. Please try again."
      );
    } finally {
      setAddingMember(false);
    }
  };

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

  const canManageMembers = ["owner", "admin"].includes(
    workspace.role
  );

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

      {/* Workspace details */}
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

      {/* Workspace navigation tabs */}
      <div className="mt-8 border-b border-slate-200">
        <div
          role="tablist"
          aria-label="Workspace sections"
          className="flex gap-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "projects"}
            onClick={() => setActiveTab("projects")}
            className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
              activeTab === "projects"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Projects
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              {projects.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "members"}
            onClick={() => setActiveTab("members")}
            className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
              activeTab === "members"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Members
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              {members.length}
            </span>
          </button>
        </div>
      </div>

      {/* Projects tab */}
      {activeTab === "projects" && (
        <section
          role="tabpanel"
          className="mt-8"
        >
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
      )}

      {/* Members tab */}
      {activeTab === "members" && (
        <section
          role="tabpanel"
          className="mt-8"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Workspace members
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                View people who have access to this workspace.
              </p>
            </div>

            <span className="text-sm text-slate-500">
              {members.length} total
            </span>
          </div>

          {/* Add member form */}
          {canManageMembers && (
            <form
              onSubmit={handleAddMember}
              className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <label
                  htmlFor="member-email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Add an existing WorkSync user
                </label>

                <input
                  id="member-email"
                  type="email"
                  value={memberEmail}
                  onChange={(event) => {
                    setMemberEmail(event.target.value);
                    setMembersError("");
                    setMemberSuccess("");
                  }}
                  placeholder="teammate@example.com"
                  autoComplete="email"
                  required
                  disabled={addingMember}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                />
              </div>

              <button
                type="submit"
                disabled={addingMember || !memberEmail.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} />
                {addingMember ? "Adding..." : "Add member"}
              </button>
            </form>
          )}

          {/* Member feedback */}
          {membersError && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {membersError}
            </p>
          )}

          {memberSuccess && (
            <p
              role="status"
              className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
            >
              {memberSuccess}
            </p>
          )}

          {/* Member list */}
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {membersLoading ? (
              <p className="p-5 text-sm text-slate-500">
                Loading members...
              </p>
            ) : membersError && members.length === 0 ? (
              <div className="p-5">
                <p className="text-sm text-slate-500">
                  Unable to display workspace members.
                </p>

                <button
                  type="button"
                  onClick={loadMembers}
                  className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Retry
                </button>
              </div>
            ) : members.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">
                No members found.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {members.map((member) => {
                  const displayName =
                    member.username || member.email || "Unknown member";

                  return (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between gap-3 p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            displayName.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {member.username || "Unknown user"}
                          </p>

                          <p className="truncate text-sm text-slate-500">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
                        {member.role}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Create project modal */}
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