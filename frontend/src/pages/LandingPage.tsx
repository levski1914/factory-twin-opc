import { Link } from "react-router-dom";
import { Activity, ArrowRight, Factory, ShieldAlert } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export default function LandingPage() {
  const { user } = useAuth();
  return <main className="min-h-screen bg-slate-950 text-white">
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link className="text-2xl font-bold text-cyan-300" to="/">FactoryTwin</Link>
      <div className="flex items-center gap-5 text-sm">
        <Link to={user ? "/dashboard" : "/login"}>{user ? "Dashboard" : "Log in"}</Link>
        {!user && <Link className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950" to="/register">Get started</Link>}
      </div>
    </nav>
    <section className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-2 md:items-center">
      <div>
        <p className="mb-5 text-sm font-semibold uppercase tracking-[.25em] text-cyan-300">Industrial intelligence, live</p>
        <h1 className="text-5xl font-bold leading-tight md:text-6xl">See your factory before problems stop it.</h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-300">Connect PLC telemetry through OPC UA. Watch equipment health, trends and alarms in one clear digital twin.</p>
        <div className="mt-9 flex flex-wrap gap-4">
          <Link className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950" to={user ? "/dashboard" : "/register"}>Open FactoryTwin <ArrowRight size={18}/></Link>
          <Link className="rounded-xl border border-slate-600 px-6 py-3" to={user ? "/integrations" : "/login"}>Connect your PLC</Link>
        </div>
      </div>
      <div className="rounded-3xl border border-cyan-500/20 bg-slate-900 p-7 shadow-2xl shadow-cyan-950/30">
        <div className="mb-7 flex items-center gap-3 text-cyan-300"><Factory/> Factory overview <span className="ml-auto rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">Live</span></div>
        <div className="grid gap-4">
          {[["Motor M101", "Running", "96%"], ["Pump P201", "Warning", "78%"], ["Tank T301", "Running", "94%"]].map(([name, status, health]) =>
            <div key={name} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950 p-5"><span>{name}<small className="mt-1 block text-slate-400">{status}</small></span><strong className="text-cyan-300">{health}</strong></div>)}
        </div>
      </div>
    </section>
    <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-20 md:grid-cols-3">
      {[[Activity, "Live telemetry", "Follow equipment readings and historical trends."], [ShieldAlert, "Actionable alarms", "See issues as soon as thresholds are crossed."], [Factory, "Your sites", "Organize assets and PLC tags by company and site."]].map(([Icon, title, copy]) => {
        const Symbol = Icon as typeof Activity;
        return <div key={title as string} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"><Symbol className="mb-5 text-cyan-300"/><h2 className="mb-2 text-xl font-semibold">{title as string}</h2><p className="text-slate-400">{copy as string}</p></div>;
      })}
    </section>
  </main>;
}
