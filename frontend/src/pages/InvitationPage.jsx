import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

function InvitationPage() {
  const { token } = useParams();

  const {user,loading: authLoading,login,register,logout} = useAuth();

  const [invitation, setInvitation] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [acceptedWorkspace, setAcceptedWorkspace] =useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadInvitation = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          `/workspaces/invitations/${encodeURIComponent(token)}`,
          { signal: controller.signal }
        );

        if (controller.signal.aborted) return;

        setInvitation(response.data.invitation);
        setWorkspace(response.data.workspace);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.response?.data?.message ||
              "Unable to load this invitation."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadInvitation();

    return () => {
      controller.abort();
    };
  }, [token]);

  const handleAccept = async () => {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await api.post(
        `/workspaces/invitations/${encodeURIComponent(token)}/accept`
      );

      setAcceptedWorkspace(response.data.workspace);
      setSuccessMessage(
        response.data.message ||
          "You have joined the workspace successfully."
      );
    } catch (err) {
      const data = err.response?.data;
      if (
        err.response?.status === 409 &&
        data?.workspace &&
        data?.message?.toLowerCase().includes("already a member")
      ) {
        setAcceptedWorkspace(data.workspace);
        setSuccessMessage(data.message);
      } else {
        setError(
          data?.message ||
            "Unable to accept this invitation. Please try again."
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!invitation || busy) return;

    setBusy(true);
    setError("");

    const email = invitation.invitedEmail
      .trim()
      .toLowerCase();

    try {
      if (mode === "register") {
        await register({
          username: username.trim(),
          email,
          password,
        });
      }
      await login({ email, password });

      const response = await api.post(
        `/workspaces/invitations/${encodeURIComponent(token)}/accept`
      );

      setAcceptedWorkspace(response.data.workspace);
      setSuccessMessage(
        response.data.message ||
          "You have joined the workspace successfully."
      );
    } catch (err) {
      const data = err.response?.data;

      if (
        err.response?.status === 409 &&
        data?.workspace &&
        data?.message?.toLowerCase().includes("already a member")
      ) {
        setAcceptedWorkspace(data.workspace);
        setSuccessMessage(data.message);
      } else {
        setError(
          data?.errors?.join(", ") ||
            data?.message ||
            "Unable to complete the invitation. Please try again."
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSwitchAccount = async () => {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await logout();
      setMode("login");
      setPassword("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to sign out. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading || authLoading) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <p className="text-sm text-slate-500">
          Loading invitation...
        </p>
      </main>
    );
  }

  if (error && !invitation && !acceptedWorkspace) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <section className="rounded-2xl border border-slate-200 bg-white p-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Invitation unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-700">
            {error}
          </p>

          <Link
            to="/login"
            className="mt-6 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Go to login
          </Link>
        </section>
      </main>
    );
  }

  if (acceptedWorkspace) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <section className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl text-green-700">
            ✓
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            You're all set
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {successMessage}
          </p>

          <p className="mt-2 font-semibold text-slate-900">
            {acceptedWorkspace.name || workspace?.name}
          </p>

          <Link
            to="/dashboard"
            className="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Go to dashboard
          </Link>
        </section>
      </main>
    );
  }

  const emailMatches =
    user?.email?.trim().toLowerCase() ===
    invitation?.invitedEmail?.trim().toLowerCase();

  return (
    <main className="mx-auto max-w-lg px-6 py-12 md:py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          WorkSync invitation
        </p>

        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          Join {workspace?.name || "your workspace"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          You've been invited to collaborate on projects,
          tasks, and team discussions.
        </p>

        <div className="mt-6 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Invitation sent to
          </p>

          <p className="mt-1 break-all text-sm font-semibold text-slate-900">
            {invitation?.invitedEmail}
          </p>

          <p className="mt-3 text-xs text-slate-500">
            Expires{" "}
            {new Date(invitation.expiresAt).toLocaleString()}
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {user ? (
          <div className="mt-6">
            <p className="text-sm text-slate-600">
              Currently signed in as{" "}
              <strong className="break-all text-slate-900">
                {user.email}
              </strong>
            </p>

            {emailMatches ? (
              <>
                <p className="mt-3 text-sm text-slate-600">
                  This account matches the invited email.
                </p>

                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={busy}
                  className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Accepting..." : "Accept invitation"}
                </button>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-amber-800">
                This account doesn't match the invited email.
                Sign out and use the account belonging to the
                invitation.
              </p>
            )}

            <button
              type="button"
              onClick={handleSwitchAccount}
              disabled={busy}
              className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Use a different account
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${
                  mode === "register"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Create account
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${
                  mode === "login"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Log in
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "register" && (
                <div>
                  <label
                    htmlFor="invitation-username"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Username
                  </label>

                  <input
                    id="invitation-username"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value)
                    }
                    minLength={3}
                    maxLength={30}
                    required
                    autoComplete="username"
                    disabled={busy}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                    placeholder="Choose a username"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="invitation-email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>

                <input
                  id="invitation-email"
                  type="email"
                  value={invitation.invitedEmail}
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-600"
                />

                <p className="mt-1 text-xs text-slate-500">
                  This must be the email that received the invitation.
                </p>
              </div>

              <div>
                <label
                  htmlFor="invitation-password"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <input
                  id="invitation-password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  minLength={8}
                  required
                  autoComplete={
                    mode === "register"
                      ? "new-password"
                      : "current-password"
                  }
                  disabled={busy}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={
                  busy ||
                  (mode === "register" && !username.trim()) ||
                  !password
                }
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy
                  ? "Please wait..."
                  : mode === "register"
                    ? "Create account and join"
                    : "Log in and join"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

export default InvitationPage;