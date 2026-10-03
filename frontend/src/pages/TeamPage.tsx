import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getTeam, createTeamMember, type TeamMember } from "../services/api";
const field = "w-full rounded-lg border border-slate-600 bg-slate-950 p-3";
export default function TeamPage() {
  const { user } = useAuth();
  const allowed = ["OWNER", "ADMIN"].includes(user?.role ?? "");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("TECHNICIAN");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    getTeam()
      .then((data) => {
        if (active) setMembers(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [allowed]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const member = await createTeamMember({ name, email, password, role });
      setMembers((current) => [...current, member]);
      setName("");
      setEmail("");
      setPassword("");
      setSuccess(
        `Account created for ${member.name}. They can sign in with their email and the password you set. No email has been sent.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="main min-h-screen">
      <Link className="back-link" to="/dashboard">
        ← Dashboard
      </Link>
      <h1 className="mb-5 text-2xl">Company team</h1>
      {!allowed ? (
        <p>Only company owners and administrators can manage the team.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel space-y-4">
            <h2>People in your company</h2>
            <p className="text-sm text-slate-400">
              These accounts share your company’s sites, equipment and
              maintenance tasks.
            </p>
            {loading ? (
              <p>Loading team…</p>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-slate-700 p-3"
                >
                  <strong>{m.name || m.email}</strong>
                  <p className="break-all text-sm text-slate-400">{m.email}</p>
                  <p>
                    {m.role}
                    {m.id === user?.id ? " · You" : ""}
                  </p>
                </div>
              ))
            )}
            <h3 className="font-semibold">Who receives an alarm?</h3>
            <p className="text-sm text-slate-300">
              Confirmed alarms notify owners, administrators and technicians in
              this company. An engineer accepts responsibility from Maintenance.
              Repair reports and verification results notify management and the
              assigned engineer.
            </p>
          </section>
          <section className="panel space-y-4">
            <h2>Add a colleague</h2>
            <p className="text-sm text-slate-400">
              Create their account here to join this company. Public
              registration creates a separate company.
            </p>
            {error && (
              <p role="alert" className="text-red-300">
                {error}
              </p>
            )}
            {success && (
              <p role="status" className="text-green-300">
                {success}
              </p>
            )}
            <form onSubmit={submit}>
              <fieldset disabled={busy} className="space-y-4">
                <label className="grid gap-2">
                  Name
                  <input
                    required
                    maxLength={120}
                    className={field}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="grid gap-2">
                  Email
                  <input
                    required
                    type="email"
                    maxLength={254}
                    className={field}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="grid gap-2">
                  Role
                  <select
                    className={field}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="TECHNICIAN">
                      Engineer — equipment and maintenance
                    </option>
                    <option value="VIEWER">Observer — read only</option>
                    {user?.role === "OWNER" && (
                      <option value="ADMIN">
                        Manager — team and maintenance oversight
                      </option>
                    )}
                  </select>
                </label>
                <label className="grid gap-2">
                  Password
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={72}
                    className={field}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <p className="text-xs text-slate-400">
                  Use at least 12 characters. Share credentials directly with
                  your colleague through your agreed private channel. This form
                  does not send email.
                </p>
                <button
                  className="rounded-lg bg-cyan-400 px-4 py-3 text-slate-950 disabled:opacity-40"
                  disabled={busy}
                >
                  {busy ? "Creating…" : "Create account"}
                </button>
              </fieldset>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
