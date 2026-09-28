import {
  Activity,
  AlertTriangle,
  Bell,
  Gauge,
  LayoutDashboard,
  Settings,
  Wrench,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { assets, trendData } from "../data/mockData";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

import { useEffect, useState } from "react";
import { socket } from "../services/socket";

function Dashboard() {
  const { signOut } = useAuth();
  const running = assets.filter((a) => a.status === "RUNNING").length;
  const warnings = assets.filter((a) => a.status === "WARNING").length;

  const [assetAnalysis, setAssetAnalysis] = useState<Record<string, any>>({});
  const formatLiveValues = (assetId: string, live: any) => {
    if (!live) return null;

    if (assetId === "motor-m101") {
      return `${live.temperature}°C · ${live.current}A · ${live.vibration}mm/s`;
    }

    if (assetId === "pump-p201") {
      return `${live.flow} m³/h · ${live.pressure} bar`;
    }

    if (assetId === "tank-t301") {
      return `Level ${live.level}% · ${live.temperature}°C`;
    }

    if (assetId === "valve-v401") {
      if (live.fault) return "FAULT";
      return `${live.feedback ?? live.command} · ${live.position}%`;
    }
    return "Live";
  };

  useEffect(() => {
    socket.on("telemetry", (data) => {
      setAssetAnalysis((prev) => ({
        ...prev,
        [data.assetId]: data,
      }));

      //   console.log("BACKEND ANALYSIS", data);
    });

    return () => {
      socket.off("telemetry");
    };
  }, []);
  const dashboardAlarms = Object.values(assetAnalysis).flatMap((asset: any) =>
    asset.alarms.map((alarm: any) => ({
      ...alarm,
      assetName: asset.assetId,
    })),
  );
  const activeAlarms = dashboardAlarms.length;
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          Factory<span>Twin</span>
        </div>

        <nav>
          <a className="active">
            <LayoutDashboard size={18} /> Dashboard
          </a>
          <Link to="/assets">
            <Gauge size={18} /> Assets
          </Link>
          <Link to="/alarms">
            <Bell size={18} /> Alarms
          </Link>
          <a>
            <Activity size={18} /> Analytics
          </a>
          <a>
            <Wrench size={18} /> Maintenance
          </a>
          <Link to="/integrations"><Activity size={18} /> Integrations</Link>
          <Link to="/tag-mapping"><Wrench size={18} /> Tag mapping</Link>
          <Link to="/setup"><Settings size={18} /> Workspace</Link>
          <button onClick={() => void signOut().then(() => location.assign("/"))} className="mt-6 p-3 text-left text-slate-400 hover:text-white">Log out</button>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Plant Overview</h1>
            <p>Digital Twin + Predictive Maintenance Dashboard</p>
          </div>

          <div className="status-pill">● Live PLC Data</div>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <span>Total Assets</span>
            <strong>{assets.length}</strong>
          </div>
          <div className="stat-card">
            <span>Running</span>
            <strong>{running}</strong>
          </div>
          <div className="stat-card warning">
            <span>Warnings</span>
            <strong>{warnings}</strong>
          </div>
          <div className="stat-card danger">
            <span>Active Alarms</span>
            <strong>{activeAlarms}</strong>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel large">
            <div className="panel-header">
              <h2>Digital Twin Scene</h2>
              <span>Plant 1 / Line A</span>
            </div>

            <div className="scene">
              {assets.map((asset) => {
                const analysis = assetAnalysis[asset.id];
                const live = analysis?.values;
                const liveStatus = analysis?.status ?? "UNKNOWN";
                return (
                  <Link
                    to={`/assets/${asset.id}`}
                    key={asset.id}
                    className={`machine ${liveStatus.toLowerCase()}`}
                  >
                    <strong>{asset.name}</strong>
                    <span>{asset.type}</span>
                    <small>Health: {analysis?.healthScore ?? "--"}%</small>
                    <small>
                      {formatLiveValues(asset.id, live) ?? liveStatus}
                    </small>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Active Alarms</h2>
              <span>View all</span>
            </div>

            <div className="alarm-list">
              {dashboardAlarms.length === 0 ? (
                <p className="empty-text">No active alarms</p>
              ) : (
                dashboardAlarms.map((alarm, index) => (
                  <div key={index} className="alarm-item">
                    <AlertTriangle size={18} />
                    <div>
                      <strong>{alarm.message}</strong>
                      <span>{alarm.assetName} · live</span>
                    </div>
                    <small>{alarm.severity}</small>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Assets Health</h2>
              <span>Predictive status</span>
            </div>

            <div className="asset-list">
              {assets.map((asset) => (
                <div key={asset.id} className="asset-row">
                  <div>
                    <strong>{asset.name}</strong>
                    <span>
                      {asset.type} · {asset.location}
                    </span>
                  </div>
                  <div className="health">
                    <div style={{ width: `${asset.healthScore}%` }} />
                  </div>
                  <b>{asset.healthScore}%</b>
                </div>
              ))}
            </div>
          </div>

          <div className="panel large">
            <div className="panel-header">
              <h2>Trends & Analytics</h2>
              <span>Last 5 hours</span>
            </div>

            <div className="chart">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData}>
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="temperature" strokeWidth={2} />
                  <Line type="monotone" dataKey="vibration" strokeWidth={2} />
                  <Line type="monotone" dataKey="current" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
