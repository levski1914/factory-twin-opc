import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={user.role === "SUPER_ADMIN" ? "/admin" : "/dashboard"} replace />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await signIn(email, password);
      else await signUp({ email, password, name, companyName });
      navigate(mode === "register" ? "/setup" : "/dashboard", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
    <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8">
      <Link className="text-2xl font-bold text-cyan-300" to="/">FactoryTwin</Link>
      <h1 className="mt-8 text-3xl font-semibold">{mode === "login" ? "Welcome back" : "Create your workspace"}</h1>
      <p className="mt-2 text-slate-400">{mode === "login" ? "Sign in to view your factory." : "Start with your company and first site."}</p>
      <form className="mt-8 grid gap-4" onSubmit={submit}>
        {mode === "register" && <>
          <label className="grid gap-2 text-sm">Your name<input required className="rounded-lg border border-slate-600 bg-slate-950 p-3" value={name} onChange={e => setName(e.target.value)}/></label>
          <label className="grid gap-2 text-sm">Company<input required className="rounded-lg border border-slate-600 bg-slate-950 p-3" value={companyName} onChange={e => setCompanyName(e.target.value)}/></label>
        </>}
        <label className="grid gap-2 text-sm">Email<input required type="email" autoComplete="email" className="rounded-lg border border-slate-600 bg-slate-950 p-3" value={email} onChange={e => setEmail(e.target.value)}/></label>
        <label className="grid gap-2 text-sm">Password<input required minLength={8} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} className="rounded-lg border border-slate-600 bg-slate-950 p-3" value={password} onChange={e => setPassword(e.target.value)}/></label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button disabled={busy} className="mt-2 rounded-lg bg-cyan-400 p-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}</button>
      </form>
      <p className="mt-6 text-sm text-slate-400">{mode === "login" ? "New to FactoryTwin?" : "Already have an account?"} <Link className="text-cyan-300" to={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Register" : "Log in"}</Link></p>
    </div>
  </main>;
}
