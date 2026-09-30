import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getAssets, type Equipment } from "../services/api";

export default function AssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    getAssets()
      .then(setAssets)
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);
  const canEdit = ["OWNER", "ADMIN", "TECHNICIAN"].includes(user?.role ?? "");
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <Link to="/dashboard" className="text-sm text-cyan-300">
          ← Dashboard
        </Link>
        <header className="my-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Your equipment</h1>
            <p className="mt-2 text-slate-400">
              Equipment configured for your company and sites.
            </p>
          </div>
          {canEdit && (
            <Link
              to="/tag-mapping"
              className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950"
            >
              Add equipment
            </Link>
          )}
        </header>
        {error && (
          <p role="alert" className="mb-5 text-red-300">
            {error}
          </p>
        )}
        {loading && <p className="text-slate-400">Loading...</p>}
        {!loading && !error && assets.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 p-10">
            <h2 className="text-xl">Create your first equipment view</h2>
            <p className="mt-3 text-slate-400">
              Connect a PLC, select its tags and arrange the metrics.
            </p>
            <Link
              className="mt-5 inline-block text-cyan-300"
              to="/integrations"
            >
              Open PLC connections →
            </Link>
          </div>
        )}
        <div className="grid gap-5 md:grid-cols-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="rounded-2xl border border-slate-700 bg-slate-900 p-6"
            >
              <p className="text-xs tracking-widest text-cyan-300">
                {asset.type}
              </p>
              <h2 className="mt-2 text-xl font-semibold">{asset.name}</h2>
              <p className="mt-2 text-sm text-slate-400">
                {asset.site?.name} · {asset.location || "No location set"}
              </p>
              <p className="mt-4 text-sm text-slate-300">
                {asset.tagMappings.length} configured metrics
              </p>
              <div className="mt-6 flex gap-5">
                <Link className="text-cyan-300" to={"/equipment/" + asset.id}>
                  Open live view →
                </Link>
                {canEdit && (
                  <Link
                    className="text-slate-300"
                    to={"/tag-mapping?assetId=" + asset.id}
                  >
                    Edit
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
