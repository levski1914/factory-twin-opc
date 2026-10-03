import type { MonitoringConfig, PlcReading } from "../services/api";
export type SetupTag = {
  nodeId: string;
  tagName: string;
  role?: string;
  unit?: string;
};
export function suggestMonitoring(tags: SetupTag[]) {
  const unique = (role: string) => {
    const matches = tags.filter((t) => t.role === role);
    return matches.length === 1 ? matches[0] : undefined;
  };
  const run = unique("running") ?? unique("speed");
  const load = unique("load") ?? unique("current");
  return { run, load };
}
export function signalCheck(
  kind: "run" | "load",
  config: MonitoringConfig,
  readings: PlcReading[],
) {
  const id = kind === "run" ? config.runNodeId : config.loadNodeId;
  if (!id) return { error: "Choose a signal.", text: "Not selected" };
  const reading = readings.find((r) => r.nodeId === id);
  if (!reading?.good || reading.value == null)
    return {
      error: "",
      text: "Not checked — read PLC values to verify this signal.",
    };
  const value = reading.value;
  const booleanMode = kind === "run" && config.runCondition === "TRUE";
  if (booleanMode && typeof value !== "boolean" && value !== 0 && value !== 1)
    return {
      error: `This signal returns ${String(value)}, but ON/OFF expects true, false, 0 or 1. Choose a running feedback tag or use numeric measurement mode.`,
      text: "Incompatible value",
    };
  if (!booleanMode && (typeof value !== "number" || !Number.isFinite(value)))
    return {
      error: `This check needs a numeric measurement; the signal returned ${String(value)}. Choose a speed or working-load measurement.`,
      text: "Incompatible value",
    };
  const satisfied = booleanMode
    ? Boolean(value)
    : (value as number) >
      (kind === "run" ? config.runThreshold : config.minimumLoad);
  return {
    error: "",
    text: `Last read: ${String(value)} · ${satisfied ? "condition met" : "condition not met — equipment may be stopped or below the chosen limit"}`,
  };
}
export function monitoringSetupErrors(
  config: MonitoringConfig,
  readings: PlcReading[],
) {
  if (!config.enabled) return [];
  return [
    signalCheck("run", config, readings).error,
    signalCheck("load", config, readings).error,
    !Number.isFinite(config.runThreshold)
      ? "Enter a valid running threshold."
      : "",
    !Number.isFinite(config.minimumLoad) || config.minimumLoad < 0
      ? "Enter a non-negative working-load threshold."
      : "",
    !Number.isInteger(config.verificationSeconds) ||
    config.verificationSeconds < 5 ||
    config.verificationSeconds > 3600
      ? "Stable verification time must be 5–3600 whole seconds."
      : "",
  ].filter(Boolean);
}
