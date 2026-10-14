import { Link } from "react-router-dom";
import { CheckCheck } from "lucide-react";

function Brand() {
  return (
    <Link
      to="/"
      className="flex items-center justify-center gap-2"
    >
      <div className="rounded-xl bg-indigo-600 p-2 text-white">
        <CheckCheck size={22} />
      </div>

      <span className="text-2xl font-bold text-slate-900">
        WorkSync
      </span>
    </Link>
  );
}

export default Brand;