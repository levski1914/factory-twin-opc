import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { LiveAlarmRules } from "../components/AlarmRules";
import { EquipmentPreview } from "../components/EquipmentPreview";
import {
  getAssets,
  readEquipmentPreview,
  type Equipment,
  type PlcReading,
} from "../services/api";

export default function ConfiguredEquipmentPage() {
  const navigate = useNavigate();
  const { assetId } = useParams();
  const { user } = useAuth();
  const [asset, setAsset] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState<PlcReading[]>([]);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<
    Array<Record<string, number | string | null>>
  >([]);
  const [selectedMetric, setSelectedMetric] = useState("");
  const [readAt, setReadAt] = useState("");
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    setLoading(true);
    setHistory([]);
    setSelectedMetric("");
    setAsset(null);
    setReadings([]);
    setReadAt("");
    setError("");
    getAssets()
      .then(async (assets: Equipment[]) => {
        if (!active) return;
        const found = assets.find((item) => item.id === assetId);
        if (!found) {
          setError("Equipment not found in your workspace");
          return;
        }
        setAsset(found);
        const mappings = found.tagMappings.filter(
          (item) => item.showAsMetric !== false,
        );
        if (!mappings.length) {
          setError("No metrics configured");
          return;
        }
        setSelectedMetric(mappings[0].nodeId);
        async function poll() {
          try {
            const data = await readEquipmentPreview(mappings[0].integrationId, [
              ...new Set([
                ...mappings.map((item) => item.nodeId),
                ...(found!.alarmRules ?? []).map((rule) => rule.nodeId),
              ]),
            ]);
            if (active) {
              setReadings(data);
              const point: Record<string, number | string | null> = {
                time: new Date().toLocaleTimeString(),
              };
              data.forEach((item) => {
                point[item.nodeId] =
                  item.good && typeof item.value === "number"
                    ? item.value
                    : null;
              });
              setHistory((previous) => [...previous, point].slice(-120));
              setError("");
              setReadAt(new Date().toLocaleTimeString());
            }
          } catch (reason) {
            if (active) {
              setReadings([]);
              setHistory((previous) =>
                [...previous, { time: new Date().toLocaleTimeString() }].slice(
                  -120,
                ),
              );
              setError(
                reason instanceof Error ? reason.message : "PLC unavailable",
              );
            }
          } finally {
            if (active) timer = setTimeout(() => void poll(), 5000);
          }
        }
        void poll();
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [assetId]);
  const canEdit = ["OWNER", "ADMIN", "TECHNICIAN"].includes(user?.role ?? "");
  return (
    <main className="main min-h-screen equipment-detail">
      <div className="mx-auto max-w-screen-2xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="text-cyan-300">
            ← Dashboard
          </Link>
          {asset && canEdit && (
            <Link
              className="rounded-lg border border-slate-600 px-4 py-2"
              to={"/tag-mapping?assetId=" + asset.id}
            >
              Edit equipment
            </Link>
          )}
        </header>
        {loading && <p>Loading equipment...</p>}
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200"
          >
            {error}
          </p>
        )}
        {asset && (
          <EquipmentPreview
            expanded
            name={asset.name}
            type={asset.type}
            location={[asset.site?.name, asset.location]
              .filter(Boolean)
              .join(" · ")}
            metrics={asset.tagMappings.filter(
              (item) => item.showAsMetric !== false,
            )}
            readings={readings}
            onEdit={
              canEdit
                ? (nodeId) =>
                    navigate(
                      "/tag-mapping?assetId=" +
                        asset.id +
                        "&metricId=" +
                        encodeURIComponent(nodeId),
                    )
                : undefined
            }
            caption={
              error
                ? "PLC data unavailable"
                : readAt
                  ? "PLC values · last read " +
                    readAt +
                    " · refresh every 5 seconds"
                  : "Waiting for PLC values"
            }
          />
        )}
        {asset && (
          <div className="detail-bottom-grid">
            <section className="panel">
              <div className="panel-header">
                <h2>Live Trends</h2>
                <span>Current session · up to 120 readings</span>
              </div>
              <label className="empty-text">
                Metric{" "}
                <select
                  className="mb-4 max-w-full"
                  value={selectedMetric}
                  onChange={(event) => setSelectedMetric(event.target.value)}
                >
                  {asset.tagMappings
                    .filter((m) => m.showAsMetric !== false)
                    .map((m) => (
                      <option key={m.nodeId} value={m.nodeId}>
                        {m.label || m.tagName}
                        {m.unit ? ` (${m.unit})` : ""}
                      </option>
                    ))}
                </select>
              </label>
              {history.some(
                (point) => typeof point[selectedMetric] === "number",
              ) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={history}>
                    <XAxis dataKey="time" stroke="#8fa9c4" />
                    <YAxis stroke="#8fa9c4" />
                    <Tooltip
                      contentStyle={{
                        background: "#0b1728",
                        borderColor: "#1f354d",
                      }}
                    />
                    <Line
                      dataKey={(point) => point[selectedMetric]}
                      name={
                        asset.tagMappings.find(
                          (m) => m.nodeId === selectedMetric,
                        )?.label || selectedMetric
                      }
                      stroke="#38bdf8"
                      dot={false}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="empty-text">
                  Waiting for numeric PLC readings for this metric.
                </p>
              )}
            </section>
            <section className="panel">
              <div className="panel-header">
                <h2>Live Alarms</h2>
              </div>
              <p className="empty-text mb-3">
                Current PLC states · refresh every 5 seconds
              </p>
              <LiveAlarmRules
                rules={asset.alarmRules ?? []}
                readings={readings}
              />
              <p className="empty-text mt-4 text-xs">
                Session monitoring only. Alarm history and acknowledgement are
                not connected yet.
              </p>
            </section>
            <section className="panel">
              <div className="panel-header">
                <h2>Predictive Maintenance</h2>
              </div>
              <p className="empty-text">
                Health and prediction models are not configured for this
                equipment.
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
