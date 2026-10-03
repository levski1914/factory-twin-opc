import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  getMonitoring,
  getMaintenanceCase,
  updateMaintenanceCase,
  readMonitorNotification,
  type MonitorOverview,
  type MonitorSnapshot,
  type MaintenanceCase,
  type MaintenanceEvent,
  type MonitoringConfig,
} from "../services/api";
export const defaultMonitoring: MonitoringConfig = {
  enabled: false,
  runNodeId: "",
  runCondition: "TRUE",
  runThreshold: 0,
  loadNodeId: "",
  minimumLoad: 10,
  verificationSeconds: 15,
};
export function useMonitoring() {
  const [data, setData] = useState<MonitorOverview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = await getMonitoring();
        if (active) {
          setData(next);
          setError("");
        }
      } catch (e) {
        if (active) {
          setData(null);
          setError(e instanceof Error ? e.message : "Monitoring unavailable");
        }
      } finally {
        if (active) timer = setTimeout(() => void poll(), 1000);
      }
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);
  return { data, error };
}
export function monitorClass(snapshot?: MonitorSnapshot) {
  if (
    !snapshot ||
    snapshot.stale ||
    snapshot.error ||
    snapshot.rules.some((r) => r.state === "UNKNOWN")
  )
    return "monitor-unknown";
  if (snapshot.rules.some((r) => r.latched && r.severity === "CRITICAL"))
    return "monitor-critical";
  if (snapshot.rules.some((r) => r.state === "PENDING" || r.latched))
    return "monitor-warning";
  return "";
}
export function MonitorStatus({ snapshot }: { snapshot?: MonitorSnapshot }) {
  if (!snapshot || snapshot.stale)
    return (
      <p className="text-amber-300">
        Waiting for fresh backend measurements. Verification is paused.
      </p>
    );
  return (
    <section className="space-y-3">
      <p className="text-xs text-slate-400">
        Backend monitoring · last sample{" "}
        {new Date(snapshot.sampleAt).toLocaleTimeString()}
      </p>
      {snapshot.error && <p className="text-amber-300">{snapshot.error}</p>}
      {snapshot.rules.map((rule) => (
        <div key={rule.key} className="rounded-lg border border-slate-700 p-3">
          <strong>{rule.name}</strong>
          <p
            className={
              rule.state === "PENDING"
                ? "text-orange-300"
                : rule.latched
                  ? "text-red-300"
                  : "text-slate-300"
            }
          >
            {rule.state === "PENDING"
              ? `Checking deviation · ${Math.floor(rule.progressSeconds)}/${rule.delaySeconds}s`
              : rule.state === "INACTIVE"
                ? "Inactive"
                : rule.state === "UNKNOWN"
                  ? "Unknown · data unavailable"
                  : rule.state === "RECOVERING"
                    ? "Checking recovery"
                    : `Confirmed · ${rule.severity}`}
          </p>
        </div>
      ))}
      <p className="text-sm text-slate-400">
        Verification conditions:{" "}
        {snapshot.operating === true
          ? "running under configured load"
          : snapshot.operating === false
            ? "waiting for running/load conditions"
            : "running/load signal unavailable"}
      </p>
      {snapshot.verification && (
        <p>Repair check: {snapshot.verification.replaceAll("_", " ")}</p>
      )}
    </section>
  );
}
export function Notifications({ data }: { data: MonitorOverview | null }) {
  const [error, setError] = useState("");
  const unread = data?.notifications.filter((n) => !n.readAt) ?? [];
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Notifications · {unread.length}</h2>
        <Link to="/maintenance" className="text-sky-300">
          Maintenance →
        </Link>
      </div>
      {error && <p role="alert">{error}</p>}
      {!unread.length && <p className="empty-text">No unread notifications.</p>}
      <div className="max-h-80 space-y-3 overflow-auto">
        {unread.map((n) => (
          <div key={n.id} className="rounded-lg border border-slate-700 p-3">
            <p>{n.message}</p>
            <small className="text-slate-400">
              {new Date(n.createdAt).toLocaleString()}
            </small>
            <button
              className="ml-4 text-sky-300"
              onClick={() =>
                void readMonitorNotification(n.id).catch((e) =>
                  setError(e.message),
                )
              }
            >
              Mark read
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
function Task({ task: incomingTask }: { task: MaintenanceCase }) {
  const [task, setTask] = useState(incomingTask);
  useEffect(() => setTask(incomingTask), [incomingTask]);
  const submitting = useRef(false);
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [repairAction, setRepairAction] = useState("REPAIRED");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<MaintenanceEvent[] | null>(null);
  const canEdit =
    ["OWNER", "ADMIN", "TECHNICIAN"].includes(user?.role ?? "") &&
    (["OWNER", "ADMIN"].includes(user?.role ?? "") ||
      !task.assigneeId ||
      task.assigneeId === user?.id);
  async function act(action: "CLAIM" | "REPORT") {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const updated = await updateMaintenanceCase(task.id, {
        action,
        note,
        repairAction,
      });
      setTask(updated);
      setNote("");
      if (events) setEvents((await getMaintenanceCase(task.id)).events);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <article className="rounded-xl border border-slate-700 p-4">
      <div className="flex flex-wrap justify-between gap-3">
        <Link
          className="font-semibold text-sky-300"
          to={"/equipment/" + task.assetId}
        >
          {task.assetName}
        </Link>
        <span>
          {task.status.replaceAll("_", " ")} · {task.severity}
        </span>
      </div>
      <p className="my-2 text-sm text-slate-400">
        Responsible: {task.assigneeName ?? "Awaiting engineer"} ·{" "}
        {new Date(task.createdAt).toLocaleString()}
      </p>
      {task.reportedName && (
        <p className="text-sm">
          Repair reported by {task.reportedName}: {task.reportNote}
        </p>
      )}
      {task.status === "VERIFYING" && (
        <p className="my-3 text-cyan-300">
          Waiting for stable measurements while running under load. Reporting a
          repair does not close this task.
        </p>
      )}
      {task.status === "VERIFICATION_FAILED" && (
        <p className="my-3 text-orange-300">
          Measurements did not confirm the repair. Supervisor review required.
        </p>
      )}
      {task.status === "RESOLVED" && (
        <p className="my-3 text-green-300">
          Configured monitoring criteria passed. See evidence for the measured
          conditions.
        </p>
      )}
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      {canEdit && !["RESOLVED", "VERIFYING"].includes(task.status) && (
        <fieldset disabled={busy} className="my-3 grid gap-3">
          {(task.status !== "IN_PROGRESS" || task.assigneeId !== user?.id) && (
            <button
              className="text-left text-cyan-300"
              onClick={() => void act("CLAIM")}
            >
              {task.status === "VERIFICATION_FAILED"
                ? "Resume repair work"
                : task.assigneeId
                  ? "Take over responsibility"
                  : "Accept responsibility"}
            </button>
          )}
          <p className="text-sm text-slate-400">
            {task.status === "IN_PROGRESS" && task.assigneeId === user?.id
              ? "You are responsible for this repair. "
              : "Accepting assigns responsibility and informs management. "}
            When the work is complete, describe it below. The system will then
            check the measurements before closing the task.
          </p>
          <select
            className="rounded-lg bg-slate-950 p-2"
            value={repairAction}
            onChange={(e) => setRepairAction(e.target.value)}
          >
            <option value="REPAIRED">Repaired</option>
            <option value="REPLACED">Replaced</option>
          </select>
          <textarea
            className="rounded-lg bg-slate-950 p-3"
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe the work performed, parts replaced and checks…"
          />
          <button
            className="rounded-lg bg-cyan-500 p-2 text-slate-950 disabled:opacity-40"
            disabled={note.trim().length < 5}
            onClick={() => void act("REPORT")}
          >
            Report repair and start verification
          </button>
        </fieldset>
      )}
      <button
        className="mt-3 text-sm text-sky-300"
        onClick={() =>
          void getMaintenanceCase(task.id)
            .then((r) => setEvents(r.events))
            .catch((e) => setError(e.message))
        }
      >
        Load / refresh evidence timeline
      </button>
      {events && (
        <div className="mt-3 space-y-3">
          {events.map((e) => (
            <div key={e.id} className="border-l-2 border-slate-600 pl-3">
              <small className="text-slate-400">
                {new Date(e.createdAt).toLocaleString()} · {e.kind}
              </small>
              <p>{e.message}</p>
              <details>
                <summary className="cursor-pointer text-xs text-sky-300">
                  Measurement evidence
                </summary>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs">
                  {JSON.stringify(e.evidence, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
export function MaintenanceTasks({
  data,
  assetId,
}: {
  data: MonitorOverview | null;
  assetId?: string;
}) {
  const [showClosed, setShowClosed] = useState(false);
  const cases =
    data?.cases.filter(
      (c) =>
        (!assetId || c.assetId === assetId) &&
        (showClosed || c.status !== "RESOLVED"),
    ) ?? [];
  return (
    <section className="panel mt-4">
      <div className="panel-header">
        <h2>Maintenance tasks</h2>
        <label className="text-sm">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
          />{" "}
          Include resolved
        </label>
      </div>
      <p className="mb-4 text-xs text-slate-400">
        Evidence-based automatic checks. AI diagnosis is not connected in this
        version.
      </p>
      {!cases.length && <p className="empty-text">No tasks to display.</p>}
      <div className="space-y-4">
        {cases.map((c) => (
          <Task key={c.id} task={c} />
        ))}
      </div>
    </section>
  );
}
export { default as MonitoringEditor } from "./MonitoringSetup";
export default function MaintenancePage() {
  const { data, error } = useMonitoring();
  return (
    <main className="main min-h-screen">
      <Link className="back-link" to="/dashboard">
        ← Dashboard
      </Link>
      <h1 className="mb-5 text-2xl">Maintenance & verification</h1>
      {error && <p role="alert">{error}</p>}
      <Notifications data={data} />
      <MaintenanceTasks data={data} />
    </main>
  );
}
