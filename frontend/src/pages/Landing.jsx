
import { Link } from "react-router-dom";
import { ArrowRight, CheckCheck, Users } from "lucide-react";

function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex min-h-[80vh] max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
          <Users size={16} />
          Collaboration made simpler
        </div>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Your projects, tasks, and team discussions.
          <span className="mt-2 block text-indigo-600">
            All connected.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
          Plan projects, assign work, track progress, and keep
          important decisions connected to the work they shape.
        </p>

        <Link
          to="/signup"
          className="mt-9 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Get started
          <ArrowRight size={18} />
        </Link>
      </main>
    </div>
  );
}

export default Landing;
