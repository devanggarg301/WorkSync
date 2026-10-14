
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setError("");
    setLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setError("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        variant="dashboard"
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      {error && (
        <p
          role="alert"
          className="mx-auto mt-4 max-w-5xl px-6 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      <Outlet />
    </div>
  );
}

export default AppLayout;
