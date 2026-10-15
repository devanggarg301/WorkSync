
import {useCallback,useEffect,useMemo,useState,} from "react";
import { Link, useParams } from "react-router-dom";
import {ArrowLeft,FolderPlus,Plus,Search,X,Trash2,ShieldCheck,} from "lucide-react";
import { createPortal } from "react-dom";

import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import ProjectCard from "../components/ProjectCard";
import CreateProjectModal from "../components/CreateProjectModal";

const MEMBERS_PER_PAGE = 20;

function WorkspacePage() {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const currentUserId = user?._id;

  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState("");

  
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberSuccess, setMemberSuccess] = useState("");

  
  const [activeTab, setActiveTab] = useState("projects");

  
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState("all");
  const [currentMemberPage, setCurrentMemberPage] = useState(1);

  
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [memberActionError, setMemberActionError] = useState("");
  const [memberActionSuccess, setMemberActionSuccess] = useState("");

  
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

  
  const handleAddMember = async (event) => {
    event.preventDefault();

    const email = memberEmail.trim().toLowerCase();

    if (!email || addingMember) return;

    setAddingMember(true);
    setMembersError("");
    setMemberSuccess("");
    setMemberActionError("");
    setMemberActionSuccess("");

    try {
      const response = await api.post(
        `/workspaces/${workspaceId}/members`,
        { email }
      );

      const newMember = response.data.member;

      
      setMembers((currentMembers) => [
        newMember,
        ...currentMembers,
      ]);

      setMemberEmail("");
      setMemberSearch("");
      setMemberRoleFilter("all");
      setCurrentMemberPage(1);

      setMemberSuccess(
        response.data.message || "Member added successfully."
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

  
  const handleChangeMemberRole = async (userId, newRole) => {
    if (updatingRoleUserId || removingMemberId) return;

    const targetId = String(userId);

    const previousRole = members.find(
      (member) => String(member.userId) === targetId
    )?.role;

    if (!previousRole || previousRole === newRole) return;

    setUpdatingRoleUserId(targetId);
    setMemberActionError("");
    setMemberActionSuccess("");
    setMembersError("");
    setMemberSuccess("");

    
    setMembers((currentMembers) =>
      currentMembers.map((member) =>
        String(member.userId) === targetId
          ? { ...member, role: newRole }
          : member
      )
    );

    try {
      const response = await api.patch(
        `/workspaces/${workspaceId}/members/${userId}/role`,
        { role: newRole }
      );

      const savedRole = response.data.membership.role;

      
      setMembers((currentMembers) =>
        currentMembers.map((member) =>
          String(member.userId) === targetId
            ? { ...member, role: savedRole }
            : member
        )
      );

      setMemberActionSuccess(
        `Updated ${newRole === "admin" ? "admin" : "member"} role successfully.`
      );
    } catch (err) {
      
      setMembers((currentMembers) =>
        currentMembers.map((member) =>
          String(member.userId) === targetId
            ? { ...member, role: previousRole }
            : member
        )
      );

      setMemberActionError(
        err.response?.data?.message ||
          "Unable to update member role. Please try again."
      );
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  
  const handleStartRemoveMember = (member) => {
    setMemberActionError("");
    setMemberActionSuccess("");
    setMemberToRemove(member);
  };

  
  const handleCancelRemoveMember = () => {
    if (removingMemberId) return;

    setMemberToRemove(null);
    setMemberActionError("");
  };

  
  const handleConfirmRemoveMember = async () => {
    if (
      !memberToRemove ||
      removingMemberId ||
      updatingRoleUserId
    ) {
      return;
    }

    const target = memberToRemove;
    const targetId = String(target.userId);

    setRemovingMemberId(targetId);
    setMemberActionError("");
    setMemberActionSuccess("");
    setMembersError("");
    setMemberSuccess("");

    try {
      await api.delete(
        `/workspaces/${workspaceId}/members/${target.userId}`
      );

      setMembers((currentMembers) =>
        currentMembers.filter(
          (member) => String(member.userId) !== targetId
        )
      );

      setMemberToRemove(null);

      setMemberActionSuccess(
        `${target.username || target.email || "Member"} was removed from the workspace.`
      );
    } catch (err) {
      setMemberActionError(
        err.response?.data?.message ||
          "Unable to remove this member. Please try again."
      );
    } finally {
      setRemovingMemberId(null);
    }
  };

  
  const filteredMembers = useMemo(() => {
    const search = memberSearch.trim().toLowerCase();

    return members.filter((member) => {
      const username = (member.username || "").toLowerCase();
      const email = (member.email || "").toLowerCase();

      const matchesSearch =
        !search ||
        username.includes(search) ||
        email.includes(search);

      const matchesRole =
        memberRoleFilter === "all" ||
        member.role === memberRoleFilter;

      return matchesSearch && matchesRole;
    });
  }, [members, memberSearch, memberRoleFilter]);

  const totalMemberPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE)
  );

  const visibleMembers = useMemo(() => {
    const startIndex =
      (currentMemberPage - 1) * MEMBERS_PER_PAGE;

    return filteredMembers.slice(
      startIndex,
      startIndex + MEMBERS_PER_PAGE
    );
  }, [filteredMembers, currentMemberPage]);

  
  useEffect(() => {
    setCurrentMemberPage((page) =>
      Math.min(page, totalMemberPages)
    );
  }, [totalMemberPages]);

  const handleSearchChange = (event) => {
    setMemberSearch(event.target.value);
    setCurrentMemberPage(1);
  };

  const handleRoleFilterChange = (event) => {
    setMemberRoleFilter(event.target.value);
    setCurrentMemberPage(1);
  };

  const clearMemberFilters = () => {
    setMemberSearch("");
    setMemberRoleFilter("all");
    setCurrentMemberPage(1);
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

  const canChangeMemberRoles = workspace.role === "owner";

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
        <section role="tabpanel" className="mt-8">
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

              {canManageMembers && (
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

              {canManageMembers && (
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
        <section role="tabpanel" className="mt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Workspace members
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Search members, manage roles, and control access.
              </p>
            </div>

            <span className="text-sm text-slate-500">
              {members.length} total
            </span>
          </div>

          {/* Add member */}
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

          {/* Add-member feedback */}
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

          {/* Role/removal feedback */}
          {memberActionError && !memberToRemove && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {memberActionError}
            </p>
          )}

          {memberActionSuccess && (
            <p
              role="status"
              className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
            >
              {memberActionSuccess}
            </p>
          )}

          {/* Search and role filter */}
          <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_200px_auto] sm:items-end">
            <div>
              <label
                htmlFor="member-search"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Search members
              </label>

              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="member-search"
                  type="search"
                  value={memberSearch}
                  onChange={handleSearchChange}
                  placeholder="Search name or email..."
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="member-role-filter"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Filter by role
              </label>

              <select
                id="member-role-filter"
                value={memberRoleFilter}
                onChange={handleRoleFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="all">All roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
            </div>

            <button
              type="button"
              onClick={clearMemberFilters}
              disabled={
                !memberSearch && memberRoleFilter === "all"
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X size={15} />
              Clear
            </button>
          </div>

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
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center">
                <Search
                  size={24}
                  className="mx-auto text-slate-400"
                />

                <p className="mt-2 text-sm font-semibold text-slate-700">
                  No members found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Try another search term or role.
                </p>

                <button
                  type="button"
                  onClick={clearMemberFilters}
                  className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100">
                  {visibleMembers.map((member) => {
                    const displayName =
                      member.username ||
                      member.email ||
                      "Unknown member";

                    const targetId = String(member.userId);
                    const isSelf =
                      Boolean(currentUserId) &&
                      targetId === String(currentUserId);

                    const isOwner = member.role === "owner";

                    
                    
                    const canRemoveThisMember =
                      canManageMembers &&
                      !isSelf &&
                      !isOwner &&
                      (workspace.role === "owner" ||
                        member.role === "member");

                    const isChangingRole =
                      updatingRoleUserId === targetId;

                    return (
                      <div
                        key={member.userId}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
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
                              {isSelf && (
                                <span className="ml-2 font-normal text-slate-400">
                                  (You)
                                </span>
                              )}
                            </p>

                            <p className="truncate text-sm text-slate-500">
                              {member.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Only the owner can change roles. */}
                          {canChangeMemberRoles && !isOwner ? (
                            <label className="flex items-center gap-2">
                              <span className="sr-only">
                                Role for {displayName}
                              </span>

                              <select
                                value={member.role}
                                onChange={(event) => {
                                  void handleChangeMemberRole(
                                    member.userId,
                                    event.target.value
                                  );
                                }}
                                disabled={
                                  Boolean(updatingRoleUserId) ||
                                  Boolean(removingMemberId)
                                }
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm capitalize outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                              >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>

                              {isChangingRole && (
                                <span className="text-xs text-slate-500">
                                  Saving...
                                </span>
                              )}
                            </label>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium capitalize text-slate-700">
                              {member.role}
                            </span>
                          )}

                          {canRemoveThisMember && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStartRemoveMember(member)
                              }
                              disabled={
                                Boolean(removingMemberId) ||
                                Boolean(updatingRoleUserId)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 size={14} />
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    Showing{" "}
                    {(currentMemberPage - 1) *
                      MEMBERS_PER_PAGE +
                      1}{" "}
                    to{" "}
                    {Math.min(
                      currentMemberPage * MEMBERS_PER_PAGE,
                      filteredMembers.length
                    )}{" "}
                    of {filteredMembers.length} members
                  </p>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentMemberPage((page) =>
                          Math.max(1, page - 1)
                        )
                      }
                      disabled={currentMemberPage === 1}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <span className="whitespace-nowrap text-sm text-slate-600">
                      Page {currentMemberPage} of {totalMemberPages}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentMemberPage((page) =>
                          Math.min(totalMemberPages, page + 1)
                        )
                      }
                      disabled={
                        currentMemberPage >= totalMemberPages
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
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

      {/* In-app removal confirmation */}
      {memberToRemove &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center bg-slate-950/60 p-4"
            style={{ zIndex: 9999 }}
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !removingMemberId
              ) {
                handleCancelRemoveMember();
              }
            }}
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="remove-member-title"
              aria-describedby="remove-member-description"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 size={22} />
              </div>

              <h2
                id="remove-member-title"
                className="mt-4 text-lg font-bold text-slate-900"
              >
                Remove this member?
              </h2>

              <p
                id="remove-member-description"
                className="mt-2 text-sm leading-6 text-slate-600"
              >
                <span className="font-semibold text-slate-900">
                  {memberToRemove.username ||
                    memberToRemove.email ||
                    "This member"}
                </span>{" "}
                will lose access to this workspace. This action
                does not delete their WorkSync account.
              </p>

              {memberActionError && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                  {memberActionError}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancelRemoveMember}
                  disabled={Boolean(removingMemberId)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmRemoveMember}
                  disabled={Boolean(removingMemberId)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <Trash2 size={16} />
                  {removingMemberId ? "Removing..." : "Remove member"}
                </button>
              </div>
            </section>
          </div>,
          document.body
        )}
    </main>
  );
}

export default WorkspacePage;