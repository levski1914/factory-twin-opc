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
import { alarms, assets, trendData } from "../data/mockData";
import { Link } from "react-router-dom";

import { useEffect, useState } from "react";
import { socket } from "../services/socket";

function Dashboard() {
  const running = assets.filter((a) => a.status === "RUNNING").length;
  const warnings = assets.filter((a) => a.status === "WARNING").length;

  const [liveAssetValues, setLiveAssetValues] = useState<Record<string, any>>(
    {},
  );
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

  const getLiveStatus = (assetId: string, live: any) => {
    if (!live) return "STOPPED";

    if (assetId === "motor-m101") {
      if (live.temperature > 85 || live.vibration > 9 || live.current > 10) {
        return "ALARM";
      }

      if (live.temperature > 70 || live.vibration > 8 || live.current > 9) {
        return "WARNING";
      }

      return "RUNNING";
    }

    if (assetId === "pump-p201") {
      if (live.pressure < 1.5 || live.vibration > 8) return "ALARM";
      if (live.pressure < 2 || live.vibration > 6) return "WARNING";
      return "RUNNING";
    }

    if (assetId === "tank-t301") {
      if (live.level < 10 || live.level > 95) return "ALARM";
      if (live.level < 20 || live.level > 85) return "WARNING";
      return "RUNNING";
    }

    if (assetId === "valve-v401") {
      if (live.position === "CLOSED") return "WARNING";
      return "RUNNING";
    }

    return "RUNNING";
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
  const getDashboardAlarms = () => {
    const generatedAlarms: {
      assetName: string;
      message: string;
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    }[] = [];

    Object.entries(liveAssetValues).forEach(([assetId, live]: any) => {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) return;

      if (assetId === "motor-m101") {
        if (live.temperature > 85) {
          generatedAlarms.push({
            assetName: asset.name,
            message: "Critical temperature",
            severity: "CRITICAL",
          });
        } else if (live.temperature > 70) {
          generatedAlarms.push({
            assetName: asset.name,
            message: "High temperature",
            severity: "HIGH",
          });
        }

        if (live.vibration > 8) {
          generatedAlarms.push({
            assetName: asset.name,
            message: "High vibration",
            severity: "HIGH",
          });
        }

        if (live.current > 9) {
          generatedAlarms.push({
            assetName: asset.name,
            message: "Over current",
            severity: "MEDIUM",
          });
        }
      }

      if (assetId === "pump-p201") {
        if (live.pressure < 1.5) {
          generatedAlarms.push({
            assetName: asset.name,
            message: "Low pressure",
            severity: "HIGH",
          });
        }

        if (live.vibration > 6) {
          generatedAlarms.push({
            assetName: asset.name,
            message: "Pump vibration warning",
            severity: "MEDIUM",
          });
        }
      }

      if (assetId === "tank-t301") {
        if (live.level < 20) {
          generatedAlarms.push({
            assetName: asset.name,
            message: "Low tank level",
            severity: "HIGH",
          });
        }

        if (live.level > 85) {
          generatedAlarms.push({
            assetName: asset.name,
            message: "High tank level",
            severity: "HIGH",
          });
        }
      }

      if (assetId === "valve-v401") {
        if (live.position === "CLOSED") {
          generatedAlarms.push({
            assetName: asset.name,
            message: "Valve closed",
            severity: "LOW",
          });
        }
      }
    });

    return generatedAlarms;
  };
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
          <a>
            <Settings size={18} /> Settings
          </a>
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
