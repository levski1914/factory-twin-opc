import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Gauge, Thermometer, Activity, Zap } from "lucide-react";
import { useEffect, useState, type JSX } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { assets } from "../data/mockData";
import { socket } from "../services/socket";
import { getTagMappings } from "../services/api";

export default function AssetDetail() {
  const { assetId } = useParams();
  const chartColors: Record<string, string> = {
    temperature: "#f97316",
    vibration: "#a855f7",
    current: "#38bdf8",
    flow: "#22c55e",
    pressure: "#eab308",
    level: "#38bdf8",
    inletFlow: "#22c55e",
    outletFlow: "#ef4444",
    position: "#a855f7",
  };
  const asset = assets.find((item) => item.id === assetId);
  const [liveValues, setLiveValues] = useState(asset?.values);
  const [liveAlarms, setLiveAlarms] = useState<string[]>([]);
  const [liveTrendData, setLiveTrendData] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [tagMappings, setTagMappings] = useState<any[]>([]);
  const healthScore = analysis?.healthScore ?? 100;
  const [eventHistory, setEventHistory] = useState<
    { time: string; message: string }[]
  >([]);

  const predictive = analysis?.predictive ?? {
    wear: 0,
    risk: "LOW",
    daysToFailure: 999,
    recommendation: "No action required",
  };
  const healthColor =
    healthScore > 80 ? "#22c55e" : healthScore > 60 ? "#facc15" : "#ef4444";

  const getAssetStatus = () => {
    if (healthScore <= 50) return "ALARM";

    if (liveAlarms.length > 0) return "WARNING";

    return "RUNNING";
  };

  const assetStatus = getAssetStatus();
  //   useEffect(() => {
  //     socket.on("telemetry", (data) => {
  //       console.log("TELEMETRY", data);
  //     });

  //     return () => {
  //       socket.off("telemetry");
  //     };
  //   }, []);
  useEffect(() => {
    async function loadMappings() {
      if (!assetId) return;
      const data = await getTagMappings(assetId);
      setTagMappings(data);
    }

    loadMappings();
  }, [assetId]);
  useEffect(() => {
    socket.on("telemetry", (data) => {
      if (data.assetId !== assetId) return;

      setAnalysis(data);
      setLiveValues(data.values);
      setLiveAlarms(data.alarms.map((a: any) => a.message));

      setLiveTrendData((prev) => {
        const newPoint = {
          time: new Date(data.timestamp).toLocaleTimeString("bg-BG", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          ...data.values,
        };

        return [...prev, newPoint].slice(-360);
      });
    });

    return () => {
      socket.off("telemetry");
    };
  }, [assetId]);

  useEffect(() => {
    setLiveTrendData([]);
    setEventHistory([]);
    setLiveAlarms([]);
  }, [assetId]);
  useEffect(() => {
    if (!liveValues) return;

    const events: string[] = [];

    if ((liveValues.temperature ?? 0) > 70) {
      events.push("Temperature exceeded 70°C");
    }

    if ((liveValues.vibration ?? 0) > 8) {
      events.push("High vibration detected");
    }

    if ((liveValues.current ?? 0) > 18) {
      events.push("Current exceeded 18A");
    }

    events.forEach((event) => {
      setEventHistory((prev) => {
        const exists = prev[0]?.message === event;

        if (exists) return prev;

        return [
          {
            time: new Date().toLocaleTimeString(),
            message: event,
          },
          ...prev,
        ].slice(0, 15);
      });
    });
  }, [liveValues]);

  if (!asset) {
    return (
      <main className="main">
        <h1>Asset not found</h1>
        <Link to="/dashboard">Back to dashboard</Link>
      </main>
    );
  }
  const getMetricCards = () => {
    const labelByRole: Record<string, string> = {
      current: "Current",
      temperature: "Temperature",
      speed: "Speed",
      load: "Load",
      power: "Power",
      vibration: "Vibration",
      pressure: "Pressure",
      flow: "Flow",
      level: "Level",
      position: "Position",
    };

    const iconByRole: Record<string, JSX.Element> = {
      current: <Zap size={24} />,
      power: <Activity size={24} />,
      temperature: <Thermometer size={24} />,
      speed: <Gauge size={24} />,
      load: <Gauge size={24} />,
      vibration: <Activity size={24} />,
    };
    if (tagMappings.length > 0 && liveValues) {
      return tagMappings
        .filter((m) => m.showAsMetric)
        .sort((a, b) => (a.displaySlot ?? 999) - (b.displaySlot ?? 999))
        .map((m) => {
          const value = liveValues[m.sourceField ?? m.role];

          return {
            label: m.label ?? labelByRole[m.role] ?? m.role,
            value: `${value ?? "--"} ${m.unit ?? ""}`,
            icon: iconByRole[m.role] ?? <Activity size={24} />,
          };
        });
    }
    if (!liveValues) return [];

    if (asset.type === "Motor") {
      return [
        {
          label: "Current",
          value: `${Number(liveValues.current).toFixed(1)} A`,
          icon: <Zap size={24} />,
        },
        {
          label: "Power",
          value: `${liveValues.power} kW`,
          icon: <Activity size={24} />,
        },
        {
          label: "Temperature",
          value: `${liveValues.temperature} °C`,
          icon: <Thermometer size={24} />,
        },
        {
          label: "Speed",
          value: `${liveValues.speed} rpm`,
          icon: <Gauge size={24} />,
        },
      ];
    }

    if (asset.type === "Pump") {
      return [
        {
          label: "Flow",
          value: `${liveValues.flow} m³/h`,
          icon: <Activity size={24} />,
        },
        {
          label: "Pressure",
          value: `${liveValues.pressure} bar`,
          icon: <Gauge size={24} />,
        },
        {
          label: "Efficiency",
          value: `${liveValues.efficiency} %`,
          icon: <Zap size={24} />,
        },
        {
          label: "Vibration",
          value: `${liveValues.vibration} mm/s`,
          icon: <Activity size={24} />,
        },
      ];
    }

    if (asset.type === "Tank") {
      return [
        {
          label: "Level",
          value: `${liveValues.level} %`,
          icon: <Gauge size={24} />,
        },
        {
          label: "Volume",
          value: `${liveValues.volume} L`,
          icon: <Activity size={24} />,
        },
        {
          label: "Inlet Flow",
          value: `${liveValues.inletFlow} m³/h`,
          icon: <Zap size={24} />,
        },
        {
          label: "Outlet Flow",
          value: `${liveValues.outletFlow} m³/h`,
          icon: <Zap size={24} />,
        },
      ];
    }

    if (asset.type === "Valve") {
      return [
        {
          label: "Command",
          value: liveValues.command,
          icon: <Zap size={24} />,
        },
        {
          label: "Feedback",
          value: liveValues.feedback,
          icon: <Activity size={24} />,
        },
        {
          label: "Position",
          value: `${liveValues.position} %`,
          icon: <Gauge size={24} />,
        },
        {
          label: "Cycles",
          value: liveValues.cycles,
          icon: <Activity size={24} />,
        },
      ];
    }

    return [];
  };

  useEffect(() => {
    async function loadHistory() {
      const res = await fetch(
        `http://localhost:3000/telemetry/${assetId}/history?minutes=60`,
      );

      const history = await res.json();
      setLiveTrendData(history);
    }

    if (assetId) {
      loadHistory();
    }
  }, [assetId]);
  const metricCards = getMetricCards();
  const getChartLines = () => {
    if (asset.type === "Motor") {
      return ["temperature", "vibration", "current"];
    }

    if (asset.type === "Pump") {
      return ["flow", "pressure", "vibration"];
    }

    if (asset.type === "Tank") {
      return ["level", "inletFlow", "outletFlow"];
    }

    if (asset.type === "Valve") {
      return ["position"];
    }

    return [];
  };

  const chartLines = getChartLines();
  return (
    <main className="main">
      <Link to="/dashboard" className="back-link">
        <ArrowLeft size={18} />
        Back to dashboard
      </Link>

      <header className="topbar">
        <div>
          <h1>{asset.name}</h1>
          <p>
            {asset.type} · {asset.location}
          </p>
        </div>

        <div className={`asset-status ${assetStatus.toLowerCase()}`}>
          {assetStatus}
        </div>
      </header>

      <section className="asset-detail-grid">
        <div className="panel asset-hero">
          <div className="motor-icon">⚙️</div>

          <h2>{asset.name}</h2>
          <p>Health Score</p>
          <div className="big-health">
            <div
              style={{
                width: `${healthScore}%`,
                background: healthColor,
              }}
            />
          </div>

          <strong>{healthScore}%</strong>
        </div>

        {metricCards.map((metric) => (
          <div className="metric-card" key={metric.label}>
            {metric.icon}
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </section>
      <section className="panel plant-flow-panel">
        <div className="panel-header">
          <h2>Plant Flow View</h2>
          <span>Tank → Valve → Pump → Motor</span>
        </div>

        <div className="plant-flow">
          <div className="flow-node running">
            <span className="flow-icon">🛢️</span>
            <strong>TANK T301</strong>
            <small>Level 68%</small>
          </div>

          <div className="flow-line" />

          <div className="flow-node running">
            <span className="flow-icon">🔘</span>
            <strong>VALVE V401</strong>
            <small>OPEN</small>
          </div>

          <div className="flow-line" />

          <div className="flow-node running">
            <span className="flow-icon">💧</span>
            <strong>PUMP P201</strong>
            <small>RUNNING</small>
          </div>

          <div className="flow-line" />

          <div
            className={`flow-node ${healthScore < 60 ? "alarm" : healthScore < 80 ? "warning" : "running"}`}
          >
            <span className="flow-icon">⚙️</span>
            <strong>MOTOR M101</strong>
            <small>{healthScore}% health</small>
          </div>
        </div>
      </section>
      <section className="detail-bottom-grid">
        <section className="panel detail-chart">
          <div className="panel-header">
            <h2>{asset.name} Trends</h2>
            <span>{chartLines.join(" / ")}</span>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={liveTrendData}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              {chartLines.map((line) => (
                <Line
                  key={line}
                  type="monotone"
                  dataKey={line}
                  strokeWidth={2}
                  stroke={chartColors[line] ?? "#38bdf8"}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </section>
        <section className="panel live-alarms-panel">
          <div className="panel-header">
            <h2>Live Alarms</h2>
            <span>{liveAlarms.length} active</span>
          </div>

          {liveAlarms.length === 0 ? (
            <p className="empty-text">No active alarms</p>
          ) : (
            <div className="alarm-list">
              {liveAlarms.map((alarm) => (
                <div key={alarm} className="alarm-item compact">
                  <strong>{alarm}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel predictive-panel">
          <div className="panel-header">
            <h2>Predictive</h2>
            <span>AI Analysis</span>
          </div>

          <div className="predictive-content">
            <h3>Bearing Condition</h3>

            <div className="big-health">
              <div
                style={{
                  width: `${predictive.wear}%`,
                  backgroundColor:
                    predictive.risk === "LOW"
                      ? "#22c55e"
                      : predictive.risk === "MEDIUM"
                        ? "#facc15"
                        : "#ef4444",
                }}
              />
            </div>

            <strong>{predictive.wear}% wear</strong>

            <p>
              <b>Risk:</b> {predictive.risk}
            </p>

            <p>
              <b>Failure:</b> {predictive.daysToFailure} days
            </p>

            <p>
              <b>Action:</b> {predictive.recommendation}
            </p>
          </div>
        </section>
      </section>
      <section className="panel history-panel">
        <div className="panel-header">
          <h2>Event History</h2>
          <span>{eventHistory.length} events</span>
        </div>

        <div className="history-list">
          {eventHistory.length === 0 ? (
            <p className="empty-text">No events yet</p>
          ) : (
            eventHistory.map((event, index) => (
              <div key={index} className="history-item">
                <span>{event.time}</span>
                <strong>{event.message}</strong>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
