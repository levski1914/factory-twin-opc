// src/pages/TagMappingPage.tsx

import { useEffect, useState } from "react";
import { createAsset, createTagMapping, getAssets } from "../services/api";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const roleOptions = [
  "current",
  "temperature",
  "speed",
  "load",
  "running",
  "fault",
  "vibration",
  "pressure",
  "flow",
  "level",
  "position",
];

const unitByRole: Record<string, string> = {
  current: "A",
  temperature: "°C",
  speed: "%",
  load: "%",
  running: "bool",
  vibration: "mm/s",
  pressure: "bar",
  flow: "m³/h",
  level: "%",
  position: "%",
};

export default function TagMappingPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [integrationId] = useState("TEMP_INTEGRATION_ID");
  const [discoveredTags, setDiscoveredTags] = useState<any[]>([]);
  async function loadAssets() {
    const data = await getAssets();
    setAssets(data);
    if (data[0] && !selectedAssetId) {
      setSelectedAssetId(data[0].id);
    }
  }
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("discoveredTags") ?? "[]");
    setDiscoveredTags(stored);
  }, []);
  useEffect(() => {
    loadAssets();
  }, []);

  async function handleCreateDemoAsset() {
    await createAsset({
      name: "MOTOR M101",
      type: "MOTOR",
      location: "Plant 1 / Line A",
    });

    loadAssets();
  }

  async function handleMapTag(tag: any, role: string, displaySlot: number) {
    await createTagMapping({
      integrationId,
      assetId: selectedAssetId,
      tagName: tag.tagName,
      nodeId: tag.nodeId,
      role,
      sourceField: role,
      label: tag.label,
      unit: unitByRole[role] ?? "",
      displaySlot,
      showAsMetric: true,
      showInTrend: true,
      useInHealth: true,
      useInAlarms: true,
    });

    alert("Tag mapped");
  }

  return (
    <main className="main">
      <Link to="/" className="back-link">
        <ArrowLeft size={18} />
        Back to dashboard
      </Link>
      <header className="topbar">
        <div>
          <h1>Tag Mapping</h1>
          <p>Map PLC tags to assets, metrics and dashboard positions</p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem("discoveredTags");
            setDiscoveredTags([]);
          }}
        >
          Clear Tags
        </button>
        <button onClick={handleCreateDemoAsset}>Create Demo Asset</button>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>Asset</h2>
          <span>{assets.length} assets</span>
        </div>

        <select
          value={selectedAssetId}
          onChange={(e) => setSelectedAssetId(e.target.value)}
        >
          <option value="">Select asset</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name} - {asset.type}
            </option>
          ))}
        </select>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Discovered OPC UA Tags</h2>
          <span>{discoveredTags.length} tags</span>
        </div>

        <div className="mapping-table">
          {discoveredTags.map((tag, index) => (
            <MappingRow
              key={tag.nodeId}
              tag={tag}
              index={index}
              disabled={!selectedAssetId}
              onMap={handleMapTag}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function MappingRow({
  tag,
  index,
  disabled,
  onMap,
}: {
  tag: any;
  index: number;
  disabled: boolean;
  onMap: (tag: any, role: string, displaySlot: number) => void;
}) {
  const suggestedRole = guessRole(tag.tagName);
  const [role, setRole] = useState(suggestedRole);
  const [label, setLabel] = useState(tag.tagName);
  const [displaySlot, setDisplaySlot] = useState(index + 1);
  return (
    <div className="mapping-row">
      <div>
        <strong>{tag.tagName}</strong>
        <span>{tag.nodeId}</span>
      </div>

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        {roleOptions.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>

      <span>{unitByRole[role] ?? "-"}</span>

      <select
        value={displaySlot}
        onChange={(e) => setDisplaySlot(Number(e.target.value))}
      >
        <option value={1}>Card 1</option>
        <option value={2}>Card 2</option>
        <option value={3}>Card 3</option>
        <option value={4}>Card 4</option>
      </select>

      <button
        disabled={disabled}
        onClick={() => onMap({ ...tag, label }, role, displaySlot)}
      >
        Map
      </button>
    </div>
  );
}

function guessRole(tagName: string) {
  const name = tagName.toLowerCase();

  if (name.includes("current")) return "current";
  if (name.includes("temp")) return "temperature";
  if (name.includes("speed")) return "speed";
  if (name.includes("load")) return "load";
  if (name.includes("running")) return "running";
  if (name.includes("vibration")) return "vibration";

  return "fault";
}
