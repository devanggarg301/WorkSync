
import { Link } from "react-router-dom";
import Brand from "./Brand";

function Navbar({
  variant = "public",
  onLogout,
  loggingOut = false,
}) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 md:px-12">
      <Brand />

      {variant === "dashboard" ? (
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60"
        >
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      ) : (
        <nav className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            Log in
          </Link>

          <Link
            to="/signup"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Sign up
          </Link>
        </nav>
      )}
    </header>
  );
}

export default Navbar;
