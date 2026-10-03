import type { MonitoringConfig, PlcReading } from "../services/api";
import {
  signalCheck,
  suggestMonitoring,
  type SetupTag,
} from "../utils/monitoringSetup";
const input = "w-full rounded-lg border border-slate-600 bg-slate-950 p-3";
export default function MonitoringSetup({
  value,
  onChange,
  tags,
  readings,
  readAt,
  onRead,
  reading,
}: {
  value: MonitoringConfig;
  onChange: (v: MonitoringConfig) => void;
  tags: SetupTag[];
  readings: PlcReading[];
  readAt: string;
  onRead: () => void;
  reading: boolean;
}) {
  const available: SetupTag[] = [
    ...tags,
    ...[value.runNodeId, value.loadNodeId]
      .filter(
        (id, i, a) =>
          id && a.indexOf(id) === i && !tags.some((t) => t.nodeId === id),
      )
      .map((nodeId) => ({ nodeId, tagName: nodeId })),
  ];
  const proposed = suggestMonitoring(tags);
  const run = available.find((t) => t.nodeId === value.runNodeId);
  const load = available.find((t) => t.nodeId === value.loadNodeId);
  const check = (kind: "run" | "load") => {
    const result = signalCheck(kind, value, readings);
    return (
      <p
        role={result.error ? "alert" : undefined}
        className={
          "text-sm " + (result.error ? "text-amber-300" : "text-slate-400")
        }
      >
        {result.error || result.text}
      </p>
    );
  };
  const options = (roles: string[]) =>
    [...available]
      .sort(
        (a, b) =>
          Number(roles.includes(b.role ?? "")) -
          Number(roles.includes(a.role ?? "")),
      )
      .map((t) => (
        <option key={t.nodeId} value={t.nodeId}>
          {t.tagName}
          {t.role ? ` · ${t.role}` : ""}
          {t.unit ? ` (${t.unit})` : ""}
          {roles.includes(t.role ?? "") ? " — suggested meaning" : ""}
        </option>
      ));
  return (
    <section className="panel space-y-5">
      <h2>Automatic monitoring</h2>
      <label className="flex gap-3">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        Watch this equipment and notify the team
      </label>
      <p className="text-sm text-slate-400">
        Alarm rules below decide when to notify the team. The following two
        signals are used to verify a reported repair while the machine is
        working.
      </p>
      {value.enabled && (
        <>
          <div className="rounded-xl border border-cyan-900 bg-slate-950 p-4 space-y-3">
            <h3 className="font-semibold">
              Start from your connected measurements
            </h3>
            <p className="text-sm text-slate-300">
              Running: {proposed.run?.tagName ?? "choose manually"}. Working
              load: {proposed.load?.tagName ?? "choose manually"}.
            </p>
            <p className="text-xs text-slate-400">
              Suggestions use the meanings assigned in step 2, not verified PLC
              types. If several tags have the same meaning, choose the right one
              below. Thresholds remain yours to review.
            </p>
            <button
              type="button"
              disabled={!proposed.run && !proposed.load}
              className="rounded-lg bg-cyan-400 px-4 py-2 text-slate-950 disabled:opacity-40"
              onClick={() =>
                onChange({
                  ...value,
                  ...(proposed.run
                    ? {
                        runNodeId: proposed.run.nodeId,
                        runCondition:
                          proposed.run.role === "running"
                            ? ("TRUE" as const)
                            : ("GT" as const),
                      }
                    : {}),
                  ...(proposed.load
                    ? { loadNodeId: proposed.load.nodeId }
                    : {}),
                })
              }
            >
              Use suggested signals
            </button>
          </div>
          <div className="rounded-xl border border-slate-700 p-4 space-y-3">
            <label className="grid gap-2 font-semibold">
              1. Is the machine running?
              <select
                className={input}
                value={value.runNodeId}
                onChange={(e) =>
                  onChange({ ...value, runNodeId: e.target.value })
                }
              >
                <option value="">Choose running feedback or speed</option>
                {options(["running", "speed"])}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              How should we interpret this signal?
              <select
                className={input}
                value={value.runCondition}
                onChange={(e) =>
                  onChange({
                    ...value,
                    runCondition: e.target.value as "TRUE" | "GT",
                  })
                }
              >
                <option value="TRUE">ON / OFF — running when ON</option>
                <option value="GT">
                  Numeric measurement — running above a limit
                </option>
              </select>
            </label>
            {run?.role === "speed" && value.runCondition === "TRUE" && (
              <div className="text-sm text-amber-300">
                You marked this tag as speed. Speed normally needs a numeric
                limit.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => onChange({ ...value, runCondition: "GT" })}
                >
                  Use numeric mode
                </button>
              </div>
            )}
            {run?.role === "load" && (
              <p className="text-sm text-amber-300">
                This tag is marked as load. Did you mean to use the speed or
                running-feedback tag here?
              </p>
            )}
            {value.runCondition === "GT" && (
              <label className="grid gap-2 text-sm">
                Running above ({run?.unit || "tag units"})
                <input
                  type="number"
                  step="any"
                  className={input}
                  value={
                    Number.isFinite(value.runThreshold)
                      ? value.runThreshold
                      : ""
                  }
                  onChange={(e) =>
                    onChange({ ...value, runThreshold: e.target.valueAsNumber })
                  }
                />
              </label>
            )}
            {check("run")}
          </div>
          <div className="rounded-xl border border-slate-700 p-4 space-y-3">
            <label className="grid gap-2 font-semibold">
              2. Is the machine doing work?
              <select
                className={input}
                value={value.loadNodeId}
                onChange={(e) =>
                  onChange({ ...value, loadNodeId: e.target.value })
                }
              >
                <option value="">Choose a load or current measurement</option>
                {options(["load", "current"])}
              </select>
            </label>
            <p className="text-sm text-slate-400">
              A stopped machine can cool down without being repaired. This
              measurement proves it is operating under the load you specify.
            </p>
            {load?.role === "speed" && (
              <p className="text-sm text-amber-300">
                Speed alone does not establish working load. Choose a
                load/current measurement if available.
              </p>
            )}
            <label className="grid gap-2 text-sm">
              Working load above ({load?.unit || "tag units"})
              <input
                type="number"
                min={0}
                step="any"
                className={input}
                value={
                  Number.isFinite(value.minimumLoad) ? value.minimumLoad : ""
                }
                onChange={(e) =>
                  onChange({ ...value, minimumLoad: e.target.valueAsNumber })
                }
              />
            </label>
            <p className="text-xs text-slate-400">
              Review this limit for the selected signal. 10 means 10% for a
              percent signal, but 10 A for a current signal.
            </p>
            {check("load")}
          </div>
          {value.runNodeId && value.runNodeId === value.loadNodeId && (
            <p role="alert" className="text-amber-300">
              Both checks use the same signal. Verify that it establishes both
              running and working load.
            </p>
          )}
          <button
            type="button"
            disabled={reading || !value.runNodeId || !value.loadNodeId}
            onClick={onRead}
            className="rounded-lg border border-cyan-500 px-4 py-2 text-cyan-300 disabled:opacity-40"
          >
            {reading ? "Reading PLC…" : "Check selected signals with PLC"}
          </button>
          <p className="text-xs text-slate-400">
            {readAt
              ? `Last manual read: ${readAt}. This checks the sampled values, not the full operating range.`
              : "Signals have not been checked. You can save offline, but their value types remain unverified."}
          </p>
          <details className="rounded-lg border border-slate-700 p-3">
            <summary className="cursor-pointer text-sky-300">
              Repair confirmation time · {value.verificationSeconds}s
            </summary>
            <label className="mt-3 grid gap-2 text-sm">
              Stable running time after all alarms recover (seconds)
              <input
                className={input}
                type="number"
                min={5}
                max={3600}
                value={
                  Number.isFinite(value.verificationSeconds)
                    ? value.verificationSeconds
                    : ""
                }
                onChange={(e) =>
                  onChange({
                    ...value,
                    verificationSeconds: e.target.valueAsNumber,
                  })
                }
              />
            </label>
          </details>
          <p className="rounded-lg bg-slate-950 p-3 text-sm">
            After a repair report, both conditions above must hold and all
            configured alarms must stay clear for {value.verificationSeconds}s.
            Missing or incompatible readings pause the check. A confirmed alarm
            can still open a task regardless of these repair-check conditions.
          </p>
          <p className="text-xs text-slate-400">
            Save equipment to apply changes. An open maintenance task locks
            configuration until verification passes.
          </p>
        </>
      )}
    </section>
  );
}
