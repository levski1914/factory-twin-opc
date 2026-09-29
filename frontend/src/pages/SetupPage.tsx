import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { createSite, getMyCompany, type Company } from "../services/api";

export default function SetupPage() {
  const { user, signOut } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { getMyCompany().then(setCompany).catch(e => setError(e.message)); }, []);
  async function addSite(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const site = await createSite(name, city);
      setCompany(current => current ? { ...current, sites: [...current.sites, site] } : current);
      setName("");
      setCity("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add site"); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-slate-950 p-6 text-white">
    <div className="mx-auto max-w-4xl">
      <header className="flex items-center justify-between py-5"><Link className="text-2xl font-bold text-cyan-300" to="/">FactoryTwin</Link><button onClick={() => void signOut().then(() => location.assign("/"))} className="text-slate-300">Log out</button></header>
      <p className="mt-12 text-sm uppercase tracking-widest text-cyan-300">Workspace setup</p>
      <h1 className="mt-3 text-4xl font-semibold">{company?.name ?? "Your company"}</h1>
      <p className="mt-3 text-slate-400">Welcome, {user?.name || user?.email}. Add a site before connecting its PLC.</p>
      <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-900 p-7">
        <h2 className="text-xl font-semibold">Sites</h2>
        <div className="mt-5 grid gap-3">
          {company?.sites.map(site => <div key={site.id} className="rounded-xl border border-slate-700 p-4">{site.name}{site.city ? ` · ${site.city}` : ""}</div>)}
          {company && company.sites.length === 0 && <p className="text-slate-400">No sites yet.</p>}
        </div>
        {(user?.role === "OWNER" || user?.role === "ADMIN") && <form onSubmit={addSite} className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Site name" className="rounded-lg border border-slate-600 bg-slate-950 p-3"/>
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="rounded-lg border border-slate-600 bg-slate-950 p-3"/>
          <button disabled={busy} className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Add site</button>
        </form>}
        {error && <p role="alert" className="mt-4 text-red-300">{error}</p>}
      </section>
      <div className="mt-8 flex flex-wrap gap-4"><Link className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950" to="/integrations">Connect OPC UA</Link><Link className="rounded-lg border border-slate-600 px-5 py-3" to="/dashboard">Open dashboard</Link></div>
    </div>
  </main>;
}
