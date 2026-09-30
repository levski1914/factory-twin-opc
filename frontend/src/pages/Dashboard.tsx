import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AssetsPage from "./AssetsPage";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-5">
        <Link to="/dashboard" className="text-2xl font-bold text-cyan-300">
          FactoryTwin
        </Link>
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <Link to="/integrations">PLC connections</Link>
          <Link to="/setup">Workspace</Link>
          <span className="text-slate-400">{user?.email}</span>
          <button
            onClick={() => void signOut().then(() => location.assign("/"))}
          >
            Log out
          </button>
        </div>
      </nav>
      <AssetsPage />
    </div>
  );
}
