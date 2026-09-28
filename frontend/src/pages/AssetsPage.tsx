// src/pages/AssetsPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { socket } from "../services/socket";
import { assets } from "../data/mockData";
import { ArrowLeft } from "lucide-react";

export default function AssetsPage() {
  const [assetAnalysis, setAssetAnalysis] = useState<Record<string, any>>({});

  useEffect(() => {
    socket.on("telemetry", (data) => {
      setAssetAnalysis((prev) => ({
        ...prev,
        [data.assetId]: data,
      }));
    });

    return () => {
      socket.off("telemetry");
    };
  }, []);

  return (
    <main className="main">
      <Link to="/" className="back-link">
        <ArrowLeft size={18} />
        Back to dashboard
      </Link>
      <header className="topbar">
        <div>
          <h1>Assets</h1>
          <p>Plant assets health, status and live condition</p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>Asset Registry</h2>
          <span>{assets.length} assets</span>
        </div>

        <div className="asset-table">
          {assets.map((asset) => {
            const analysis = assetAnalysis[asset.id];

            return (
              <div key={asset.id} className="asset-table-row">
                <div>
                  <strong>{asset.name}</strong>
                  <span>{asset.location}</span>
                </div>

                <span>{asset.type}</span>

                <span className={`status ${analysis?.status?.toLowerCase()}`}>
                  {analysis?.status ?? "UNKNOWN"}
                </span>

                <span>{analysis?.healthScore ?? "--"}%</span>

                <span>{analysis?.alarms?.length ?? 0}</span>

                <span>
                  {analysis?.timestamp
                    ? new Date(analysis.timestamp).toLocaleTimeString("bg-BG")
                    : "--"}
                </span>

                <Link to={`/assets/${asset.id}`}>View</Link>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
