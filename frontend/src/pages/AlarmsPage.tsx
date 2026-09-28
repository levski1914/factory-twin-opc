// src/pages/AlarmsPage.tsx
import { useEffect, useState } from "react";
import { acknowledgeAlarm, getOpenAlarms, resolveAlarm } from "../services/api";
import { socket } from "../services/socket";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
type Alarm = {
  id: string;
  assetId: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: string;
};

export default function AlarmsPage() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);

  async function loadAlarms() {
    const data = await getOpenAlarms();
    setAlarms(data);
  }

  useEffect(() => {
    loadAlarms();

    const interval = setInterval(loadAlarms, 5000);

    socket.on("alarm", () => {
      loadAlarms();
    });

    return () => {
      clearInterval(interval);
      socket.off("alarm");
    };
  }, []);
  async function handleAck(id: string) {
    await acknowledgeAlarm(id);
    loadAlarms();
  }

  async function handleResolve(id: string) {
    await resolveAlarm(id);
    loadAlarms();
  }

  return (
    <main className="main">
      <Link to="/dashboard" className="back-link">
        <ArrowLeft size={18} />
        Back to dashboard
      </Link>

      <header className="topbar">
        <div>
          <h1>Alarms</h1>
          <p>Open and acknowledged factory alarms</p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>Active Alarms</h2>
          <span>{alarms.length} active</span>
        </div>

        <div className="alarm-table">
          {alarms.length === 0 ? (
            <p className="empty-text">No active alarms</p>
          ) : (
            alarms.map((alarm) => (
              <div key={alarm.id} className="alarm-row">
                <div className="alarm-main">
                  <strong>{alarm.message}</strong>

                  <div className="alarm-meta">
                    <span>{alarm.assetId}</span>
                    <span>{alarm.severity}</span>
                    <span>{alarm.status}</span>
                  </div>
                </div>

                <div className="alarm-right">
                  <span>
                    {new Date(alarm.createdAt).toLocaleString("bg-BG")}
                  </span>

                  <div className="alarm-actions">
                    {alarm.status === "OPEN" && (
                      <button onClick={() => handleAck(alarm.id)}>Ack</button>
                    )}

                    <button onClick={() => handleResolve(alarm.id)}>
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
