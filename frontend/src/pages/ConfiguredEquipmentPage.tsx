import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
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
  const [readAt, setReadAt] = useState("");
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    setLoading(true);
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
        async function poll() {
          try {
            const data = await readEquipmentPreview(
              mappings[0].integrationId,
              mappings.map((item) => item.nodeId),
            );
            if (active) {
              setReadings(data);
              setError("");
              setReadAt(new Date().toLocaleTimeString());
            }
          } catch (reason) {
            if (active) {
              setReadings([]);
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
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-4xl">
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
      </div>
    </main>
  );
}
