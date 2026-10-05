import {
  useMonitoring,
  Notifications,
  monitorClass,
} from "../components/Monitoring";
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Activity,
  Gauge,
  LayoutDashboard,
  Settings,
  Wrench,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getAssets, type Equipment } from "../services/api";

export default function Dashboard() {
  const { data: monitoringData, error: monitoringError } = useMonitoring();
  const { user, signOut } = useAuth();
  const [assets, setAssets] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getAssets()
      .then((data) => {
        if (active) setAssets(data);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const canEdit = ["OWNER", "ADMIN", "TECHNICIAN"].includes(user?.role ?? "");
  const metrics = assets.reduce(
    (total, asset) =>
      total + asset.tagMappings.filter((m) => m.showAsMetric !== false).length,
    0,
  );
  return (
    <div className="app equipment-workspace">
      <aside className="sidebar">
        <div className="brand">
          Factory<span>Twin</span>
        </div>
        <nav>
          <NavLink to="/dashboard">
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/assets">
            <Gauge size={18} /> Assets
          </NavLink>
          <NavLink to="/integrations">
            <Activity size={18} /> PLC connections
          </NavLink>
          {canEdit && (
            <NavLink to="/tag-mapping">
              <Wrench size={18} /> Equipment editor
            </NavLink>
          )}
          <NavLink to="/maintenance">
            <Wrench size={18} /> Maintenance
          </NavLink>
          <NavLink to="/setup">
            <Settings size={18} /> Workspace
          </NavLink>
          {["OWNER", "ADMIN"].includes(user?.role ?? "") && (
            <Link to="/team" className="nav-item">
              <Settings size={18} /> Team
            </Link>
          )}
          <Link to="/history" className="nav-item"><Settings size={18} /> Dossiers</Link>
          <p className="empty-text workspace-email">{user?.email}</p>
          <button
            onClick={() => void signOut().then(() => location.assign("/"))}
          >
            Log out
          </button>
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <h1>Plant Overview</h1>
            <p>Your equipment · PLC tag configuration</p>
          </div>
          {canEdit && (
            <Link className="equipment-action" to="/tag-mapping">
              + Add equipment
            </Link>
          )}
        </header>
        {monitoringError && (
          <p className="text-amber-300">Monitoring: {monitoringError}</p>
        )}
        <div className="mb-4">
          <Notifications data={monitoringData} />
        </div>
        {error && <p role="alert">{error}</p>}
        {loading ? (
          <p className="empty-text">Loading equipment…</p>
        ) : (
          !error && (
            <>
              <section className="stats-grid">
                {[
                  ["Total Assets", assets.length],
                  [
                    "Sites with equipment",
                    new Set(assets.map((a) => a.siteId)).size,
                  ],
                  ["Configured Metrics", metrics],
                  [
                    "Assigned PLC Connections",
                    new Set(
                      assets.flatMap((a) =>
                        a.tagMappings.map((m) => m.integrationId),
                      ),
                    ).size,
                  ],
                ].map(([label, value]) => (
                  <div className="stat-card" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </section>
              <section className="content-grid">
                <div className="panel large">
                  <div className="panel-header">
                    <h2>Digital Twin Scene</h2>
                    <span>Select equipment to view live values</span>
                  </div>
                  <div className="scene equipment-scene">
                    {assets.map((asset) => (
                      <Link
                        className={
                          "machine " +
                          (asset.monitoring?.enabled
                            ? monitorClass(
                                monitoringData?.snapshots.find(
                                  (s) => s.assetId === asset.id,
                                ),
                              )
                            : "")
                        }
                        to={"/equipment/" + asset.id}
                        key={asset.id}
                      >
                        <Gauge size={36} className="mx-auto text-sky-400" />
                        <strong>{asset.name}</strong>
                        <span>{asset.type}</span>
                        <small>
                          {asset.site?.name} ·{" "}
                          {asset.location || "Location not set"}
                        </small>
                        <small>{asset.tagMappings.length} mapped tags</small>
                      </Link>
                    ))}
                    {!assets.length && (
                      <div className="empty-text">
                        Connect a PLC and create your first equipment view.{" "}
                        <Link to="/integrations">Open connections →</Link>
                      </div>
                    )}
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-header">
                    <h2>Equipment configuration</h2>
                    <span>{assets.length} assets</span>
                  </div>
                  <div className="asset-list">
                    {assets.map((asset) => (
                      <div className="equipment-list-row" key={asset.id}>
                        <div>
                          <strong>{asset.name}</strong>
                          <p className="empty-text">
                            {asset.type} · {asset.tagMappings.length} tags
                          </p>
                        </div>
                        <Link
                          to={
                            canEdit
                              ? "/tag-mapping?assetId=" + asset.id
                              : "/equipment/" + asset.id
                          }
                        >
                          {canEdit ? "Edit cards" : "View"} →
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-header">
                    <h2>Alarms & Health</h2>
                  </div>
                  <p className="empty-text">
                    Configure alarm tags in the equipment editor and view their
                    current states in the live view. Health calculations are not
                    configured yet.
                  </p>
                </div>
                <div className="panel">
                  <div className="panel-header">
                    <h2>Trends & Analytics</h2>
                  </div>
                  <p className="empty-text">
                    Open an equipment view to follow its live readings and
                    session trend. Choose the metric you want to inspect.
                  </p>
                </div>
              </section>
            </>
          )
        )}
      </main>
    </div>
  );
}
