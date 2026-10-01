import { Activity, Gauge, Waves, Settings, CircleGauge, Thermometer, Zap } from "lucide-react";
import type { Metric, PlcReading } from "../services/api";

export function EquipmentPreview({
  name,
  type,
  location,
  metrics,
  readings,
  caption,
  onReorder,
  onEdit,
  expanded = false,
}: {
  expanded?: boolean;
  name: string;
  type: string;
  location: string;
  metrics: Metric[];
  readings: PlcReading[];
  caption: string;
  onReorder?: (sourceNodeId: string, targetNodeId: string) => void;
  onEdit?: (nodeId: string) => void;
}) {
  const Icon =
    type === "PUMP"
      ? Waves
      : type === "VALVE"
        ? Settings
        : type === "TANK"
          ? Gauge
          : type === "SHAFT"
            ? CircleGauge
            : Activity;
  return (
    <section className={expanded ? "equipment-live-preview" : "panel"}>
      <div className="mb-5 flex items-center gap-4">
        <span className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
          <Icon size={28} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan-300">
            {type}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {name || "Equipment name"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {location || "Location"}
          </p>
        </div>
      </div>
      <p className="mb-5 text-xs text-slate-400">{caption}</p>
      <div className={expanded ? "equipment-metric-grid" : "grid gap-3 sm:grid-cols-2"}>
        {expanded && <div className="panel asset-hero"><Icon size={52} className="text-sky-400 mb-4"/><h3>{name}</h3><p className="empty-text">{metrics.length} configured metrics</p><p className="empty-text mt-3">Health: not configured</p></div>}
        {metrics.map((metric) => {
          const reading = readings.find(
            (item) => item.nodeId === metric.nodeId,
          );
          const value =
            !reading || !reading.good
              ? "—"
              : typeof reading.value === "boolean"
                ? reading.value
                  ? "ON"
                  : "OFF"
                : typeof reading.value === "number"
                  ? new Intl.NumberFormat(undefined, {
                      maximumFractionDigits: 2,
                    }).format(reading.value)
                  : String(reading.value ?? "—");
          return (
            <div
              key={metric.nodeId}
              className="metric-card min-w-0"
              draggable={Boolean(onReorder)}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", metric.nodeId);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                if (onReorder) event.preventDefault();
              }}
              onDrop={(event) => {
                if (onReorder) {
                  event.preventDefault();
                  onReorder(
                    event.dataTransfer.getData("text/plain"),
                    metric.nodeId,
                  );
                }
              }}
            >
              {metric.role === "temperature" ? <Thermometer size={24}/> : ["power", "current", "voltage", "energy"].includes(metric.role) ? <Zap size={24}/> : <Gauge size={24}/>}
              <p className="truncate text-sm text-slate-300">
                {metric.label || metric.tagName}
              </p>
              <p className="mt-3 break-words text-2xl font-semibold text-white">
                {value}{" "}
                <small className="text-sm font-normal text-cyan-300">
                  {metric.unit}
                </small>
              </p>
              <p
                className="mt-3 truncate text-xs text-slate-500"
                title={metric.nodeId}
              >
                {metric.tagName}
              </p>
              {reading && !reading.good && (
                <p className="mt-2 break-all text-xs text-amber-300">
                  {reading.statusCode}
                </p>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(metric.nodeId)}
                  className="mt-4 text-xs text-cyan-300"
                >
                  {onReorder ? "Edit card · drag to move" : "Edit card"}
                </button>
              )}
            </div>
          );
        })}
        {metrics.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
            Choose the tags you want to display.
          </p>
        )}
      </div>
    </section>
  );
}
