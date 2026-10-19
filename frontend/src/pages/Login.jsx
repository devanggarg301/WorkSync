import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckCheck } from "lucide-react";
import {signInWithPopup,signOut,} from "firebase/auth";

import { useAuth } from "../context/AuthContext";
import { auth, googleProvider } from "../firebase";

function Login() {
  const { login, loginWithFirebase } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const successMessage = location.state?.message;
  const busy = submitting || googleSubmitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
      });

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to log in. Check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleSubmitting(true);

    let firebaseSignedIn = false;

    try {
      const credential = await signInWithPopup(auth,googleProvider);
      firebaseSignedIn = true;

      const idToken = await credential.user.getIdToken();
      
      await loginWithFirebase(idToken);
      await signOut(auth).catch(() => {});

      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (firebaseSignedIn) {
        await signOut(auth).catch(() => {});
      }

      if (err.code === "auth/popup-closed-by-user") {
        setError("Google sign-in was cancelled.");
      } else if (err.code === "auth/unauthorized-domain") {
        setError(
          "This domain is not authorized in Firebase Authentication settings."
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to sign in with Google. Please try again."
        );
      }
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link
          to="/"
          className="mb-8 flex items-center justify-center gap-2"
        >
          <div className="rounded-xl bg-indigo-600 p-2 text-white">
            <CheckCheck size={22} />
          </div>

          <span className="text-2xl font-bold">
            WorkSync
          </span>
        </Link>

        <h1 className="text-center text-2xl font-bold">
          Welcome back
        </h1>

        <p className="mt-2 text-center text-sm text-slate-500">
          Log in to continue to your workspace.
        </p>

        {successMessage && (
          <div
            role="status"
            className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-700"
          >
            {successMessage}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span
            aria-hidden="true"
            className="text-xl font-bold text-blue-600"
          >
            G
          </span>

          {googleSubmitting
            ? "Connecting to Google..."
            : "Continue with Google"}
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">
            OR CONTINUE WITH EMAIL
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={busy}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={busy}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;