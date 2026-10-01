import type { AlarmRule, PlcReading, Equipment } from "../services/api";
const input =
  "w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-sm text-white";
export function alarmState(
  rule: AlarmRule,
  reading?: PlcReading,
): "ACTIVE" | "NORMAL" | "UNKNOWN" {
  if (!reading?.good || reading.value === null) return "UNKNOWN";
  const value = reading.value;
  if (rule.condition === "TRUE" || rule.condition === "FALSE") {
    if (typeof value !== "boolean" && value !== 0 && value !== 1)
      return "UNKNOWN";
    return Boolean(value) === (rule.condition === "TRUE") ? "ACTIVE" : "NORMAL";
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return "UNKNOWN";
  if (rule.condition === "BIT_SET") {
    if (!Number.isInteger(value) || value < -2147483648 || value > 4294967295)
      return "UNKNOWN";
    return ((value >>> rule.threshold) & 1) === 1 ? "ACTIVE" : "NORMAL";
  }
  return (
    rule.condition === "GT"
      ? value > rule.threshold
      : rule.condition === "LT"
        ? value < rule.threshold
        : value === rule.threshold
  )
    ? "ACTIVE"
    : "NORMAL";
}
export function LiveAlarmRules({
  rules,
  readings,
}: {
  rules: AlarmRule[];
  readings: PlcReading[];
}) {
  return (
    <div className="space-y-3">
      {!rules.length && <p className="empty-text">No alarm tags configured.</p>}
      {rules.map((rule, index) => {
        const reading = readings.find((r) => r.nodeId === rule.nodeId);
        const state = alarmState(rule, reading);
        return (
          <div key={index} className="rounded-xl border border-slate-700 p-3">
            <strong>{rule.name}</strong>
            <p
              className={
                state === "ACTIVE"
                  ? rule.severity === "CRITICAL"
                    ? "text-red-300"
                    : "text-amber-300"
                  : state === "NORMAL"
                    ? "text-green-300"
                    : "text-amber-300"
              }
            >
              {state === "ACTIVE"
                ? `Active · ${rule.severity}`
                : state === "NORMAL"
                  ? "Inactive"
                  : "Unknown · check PLC data"}
            </p>
            <small className="block break-all text-slate-400">
              {rule.tagName}
            </small>
            <small className="block text-slate-400">
              PLC value:{" "}
              {reading?.good && reading.value != null
                ? String(reading.value)
                : "Unavailable"}{" "}
              · Active when: {rule.condition}
              {!["TRUE", "FALSE"].includes(rule.condition)
                ? ` ${rule.threshold}`
                : ""}
            </small>
          </div>
        );
      })}
    </div>
  );
}
export function AlarmRulesEditor({
  rules,
  onChange,
  tags,
  equipment,
  type,
  equipmentId,
  integrationId,
}: {
  rules: AlarmRule[];
  onChange: (rules: AlarmRule[]) => void;
  tags: Array<{ nodeId: string; tagName: string }>;
  equipment: Equipment[];
  type: string;
  equipmentId?: string;
  integrationId: string;
}) {
  function update(index: number, change: Partial<AlarmRule>) {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...change } : r)));
  }
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold">Alarm tags · {rules.length}</h2>
      <p className="my-3 text-sm text-slate-400">
        Separate from metric cards. These rules display PLC alarm states while
        the live view is open. They do not write to the PLC.
      </p>
      <label className="grid gap-2 text-sm">
        Copy alarm template from another {type.toLowerCase()}
        <select
          className={input}
          value=""
          onChange={(e) => {
            const source = equipment.find((a) => a.id === e.target.value);
            if (source)
              onChange([
                ...rules,
                ...(source.alarmRules ?? []).map((rule) => ({
                  ...rule,
                  nodeId: "",
                  tagName: "",
                  integrationId,
                })),
              ]);
          }}
        >
          <option value="">Choose equipment…</option>
          {equipment
            .filter(
              (a) =>
                a.id !== equipmentId && a.type === type && a.alarmRules?.length,
            )
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
      </label>
      <p className="my-3 text-xs text-amber-200">
        Templates copy names, conditions and severity. Select this equipment's
        PLC tags before saving. Other equipment is not modified.
      </p>
      {rules.map((rule, index) => (
        <div
          key={index}
          className="my-4 grid gap-3 rounded-xl border border-slate-600 p-4"
        >
          <label className="grid gap-2 text-sm">
            Alarm name
            <input
              className={input}
              maxLength={120}
              value={rule.name}
              onChange={(e) => update(index, { name: e.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm">
            PLC tag
            <select
              className={input}
              value={rule.nodeId}
              onChange={(e) => {
                const tag = tags.find((t) => t.nodeId === e.target.value);
                update(index, {
                  nodeId: e.target.value,
                  tagName: tag?.tagName ?? "",
                });
              }}
            >
              <option value="">Select tag for this equipment</option>
              {[
                ...tags,
                ...(!tags.some((t) => t.nodeId === rule.nodeId) && rule.nodeId
                  ? [{ nodeId: rule.nodeId, tagName: rule.tagName }]
                  : []),
              ].map((tag) => (
                <option key={tag.nodeId} value={tag.nodeId}>
                  {tag.tagName} · {tag.nodeId}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              Active when
              <select
                className={input}
                value={rule.condition}
                onChange={(e) =>
                  update(index, {
                    condition: e.target.value as AlarmRule["condition"],
                    threshold: 0,
                  })
                }
              >
                {[
                  ["TRUE", "TRUE / 1"],
                  ["FALSE", "FALSE / 0"],
                  ["GT", "Greater than"],
                  ["LT", "Less than"],
                  ["EQ", "Equals code"],
                  ["BIT_SET", "Bit is set (32-bit word)"],
                ].map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              Severity
              <select
                className={input}
                value={rule.severity}
                onChange={(e) =>
                  update(index, {
                    severity: e.target.value as AlarmRule["severity"],
                  })
                }
              >
                <option>WARNING</option>
                <option>CRITICAL</option>
              </select>
            </label>
          </div>
          {!["TRUE", "FALSE"].includes(rule.condition) && (
            <label className="grid gap-2 text-sm">
              {rule.condition === "BIT_SET"
                ? "Bit index (0–31)"
                : "Threshold / code"}
              <input
                type="number"
                className={input}
                value={Number.isNaN(rule.threshold) ? "" : rule.threshold}
                onChange={(e) =>
                  update(index, { threshold: e.target.valueAsNumber })
                }
              />
            </label>
          )}
          <button
            type="button"
            className="text-left text-sm text-red-300"
            onClick={() => onChange(rules.filter((_, i) => i !== index))}
          >
            Remove alarm
          </button>
        </div>
      ))}
      <button
        type="button"
        className="mt-3 text-cyan-300"
        disabled={rules.length >= 64}
        onClick={() =>
          onChange([
            ...rules,
            {
              name: "",
              nodeId: "",
              tagName: "",
              integrationId,
              condition: "TRUE",
              threshold: 0,
              severity: "WARNING",
            },
          ])
        }
      >
        + Add alarm tag
      </button>
    </section>
  );
}
