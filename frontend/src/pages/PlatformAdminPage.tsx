import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getPlatformOverview, type PlatformOverview } from "../services/api";

export default function PlatformAdminPage() {
  const { user, signOut } = useAuth();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { getPlatformOverview().then(setOverview).catch(e => setError(e.message)); }, []);
  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-6xl">
    <header className="flex items-center justify-between py-5"><Link className="text-2xl font-bold text-cyan-300" to="/">FactoryTwin</Link><button onClick={() => void signOut().then(() => location.assign("/"))} className="text-slate-300">Log out</button></header>
    <p className="mt-12 text-sm uppercase tracking-widest text-cyan-300">Platform administration</p>
    <h1 className="mt-3 text-4xl font-semibold">Overview</h1>
    <p className="mt-3 text-slate-400">Signed in as {user?.email}</p>
    {error && <p role="alert" className="mt-8 text-red-300">{error}</p>}
    {!overview && !error && <p className="mt-8 text-slate-400">Loading overview...</p>}
    {overview && <>
      <div className="mt-10 grid gap-4 sm:grid-cols-4">{Object.entries(overview.counts).map(([label, count]) =>
        <div key={label} className="rounded-xl border border-slate-700 bg-slate-900 p-6"><p className="capitalize text-slate-400">{label}</p><strong className="mt-3 block text-3xl text-cyan-300">{count}</strong></div>)}</div>
      <section className="mt-9 overflow-x-auto rounded-xl border border-slate-700 bg-slate-900 p-6"><h2 className="mb-5 text-xl font-semibold">Companies</h2>
        {overview.companies.map(company => <div key={company.id} className="grid min-w-[600px] grid-cols-4 gap-4 border-t border-slate-700 py-4 text-sm"><strong>{company.name}</strong><span>{company._count.users} users</span><span>{company._count.sites} sites</span><span>{company._count.integrations} integrations</span></div>)}
        {overview.companies.length === 0 && <p className="text-slate-400">No companies yet.</p>}
      </section>
    </>}
  </div></main>;
}
