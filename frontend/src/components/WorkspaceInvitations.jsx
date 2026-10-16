import { useCallback, useEffect, useState } from "react";
import {Clock3,MailPlus,RefreshCw,ShieldAlert,Trash2,Users,} from "lucide-react";

import api from "../api/client";

function formatDate(date) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown date";
  }

  return parsedDate.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function WorkspaceInvitations({ workspaceId, canManage }) {
  const [email, setEmail] = useState("");
  const [invitations, setInvitations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const loadInvitations = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const response = await api.get(
        `/workspaces/${workspaceId}/invitations`
      );

      setInvitations(response.data.invitations || []);
    } catch (err) {
      setLoadError(
        err.response?.data?.message ||
          "Unable to load workspace invitations."
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId, canManage]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  const handleSendInvitation = async (event) => {
    event.preventDefault();

    const invitedEmail = email.trim().toLowerCase();

    if (!invitedEmail || sending) {
      return;
    }

    setSending(true);
    setActionError("");
    setNotice("");

    try {
      const response = await api.post(
        `/workspaces/${workspaceId}/invitations`,
        { email: invitedEmail }
      );

      setEmail("");
      setNotice(
        response.data.message ||
          "Invitation sent successfully."
      );

      await loadInvitations();
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "Unable to send the invitation. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvitation = async (invitationId) => {
    if (!invitationId || revokingId) {
      return;
    }

    setRevokingId(invitationId);
    setActionError("");
    setNotice("");

    try {
      const response = await api.delete(
        `/workspaces/${workspaceId}/invitations/${invitationId}`
      );

      setConfirmingId(null);
      setNotice(
        response.data.message ||
          "Invitation revoked successfully."
      );

      await loadInvitations();
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "Unable to revoke the invitation."
      );
    } finally {
      setRevokingId(null);
    }
  };

  if (!canManage) {
    return null;
  }

  const pendingCount = invitations.filter(
    (invitation) => invitation.status === "pending"
  ).length;

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MailPlus size={21} className="text-indigo-600" />

            <h2 className="text-xl font-semibold text-slate-900">
              Invite by email
            </h2>
          </div>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Invite someone who doesn't have a WorkSync account
            yet, or an existing user who hasn't joined this
            workspace. They'll receive a link to join as a member.
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
          <Users size={15} />
          {pendingCount} pending
        </span>
      </div>

      <form
        onSubmit={handleSendInvitation}
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor={`invitation-email-${workspaceId}`}
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Email address
          </label>

          <input
            id={`invitation-email-${workspaceId}`}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@example.com"
            autoComplete="email"
            maxLength={254}
            required
            disabled={sending}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
          />
        </div>

        <button
          type="submit"
          disabled={sending || !email.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MailPlus size={16} />
          {sending ? "Sending..." : "Send invitation"}
        </button>
      </form>

      {notice && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {notice}
        </p>
      )}

      {actionError && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {actionError}
        </p>
      )}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">
              Workspace invitations
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Track pending invitations and view past ones.
            </p>
          </div>

          <button
            type="button"
            onClick={loadInvitations}
            disabled={loading}
            aria-label="Refresh invitations"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {loadError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3"
          >
            <p className="text-sm text-red-700">{loadError}</p>

            <button
              type="button"
              onClick={loadInvitations}
              className="mt-2 text-sm font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Loading invitations...
          </p>
        ) : loadError ? null : invitations.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center">
            <MailPlus
              size={25}
              className="mx-auto text-slate-400"
            />

            <p className="mt-3 text-sm font-medium text-slate-700">
              No invitations yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Invitations you send will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {invitations.map((invitation) => {
              const isPending = invitation.status === "pending";
              const isConfirming =
                confirmingId === invitation._id;
              const isRevoking =
                revokingId === invitation._id;

              return (
                <article
                  key={invitation._id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <MailPlus size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="break-all text-sm font-semibold text-slate-900">
                        {invitation.invitedEmail}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span
                          className={`rounded-full px-2 py-1 font-medium capitalize ${
                            isPending
                              ? "bg-amber-50 text-amber-800"
                              : invitation.status === "accepted"
                                ? "bg-green-50 text-green-800"
                                : invitation.status === "revoked"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {invitation.status}
                        </span>

                        {isPending && (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 size={13} />
                            Expires {formatDate(invitation.expiresAt)}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-400">
                        Created {formatDate(invitation.createdAt)}
                      </p>
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {isConfirming ? (
                        <>
                          <span className="text-xs text-slate-600">
                            Revoke this invitation?
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handleRevokeInvitation(invitation._id)
                            }
                            disabled={isRevoking}
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {isRevoking ? "Revoking..." : "Confirm"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            disabled={isRevoking}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActionError("");
                            setConfirmingId(invitation._id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          Revoke
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-start gap-2 rounded-lg bg-slate-50 p-3">
          <ShieldAlert
            size={17}
            className="mt-0.5 shrink-0 text-slate-500"
          />

          <p className="text-xs leading-5 text-slate-500">
            Invitation links expire after seven days. Recipients
            must authenticate with the invited email address.
            Revoking an invitation prevents a pending link from
            being accepted.
          </p>
        </div>
      </div>
    </section>
  );
}

export default WorkspaceInvitations;