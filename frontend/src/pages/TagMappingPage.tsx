import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Save, RefreshCw } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { EquipmentPreview } from "../components/EquipmentPreview";
import {
  getAssets,
  getIntegrations,
  getSites,
  readEquipmentPreview,
  saveEquipment,
  type Equipment,
  type Integration,
  type Metric,
  type PlcReading,
  type Site,
} from "../services/api";

const roles: Record<string, string> = {
  current: "A",
  temperature: "°C",
  speed: "%",
  load: "%",
  running: "",
  fault: "",
  vibration: "mm/s",
  pressure: "bar",
  flow: "m³/h",
  level: "%",
  position: "%",
  custom: "",
};
type Draft = Metric & { enabled: boolean };
const input =
  "w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-sm text-white";

function suggest(tag: { tagName: string; nodeId: string }): Draft {
  const name = tag.tagName.toLowerCase();
  const role =
    Object.keys(roles).find(
      (key) =>
        key !== "custom" &&
        (name.includes(key) ||
          (key === "temperature" && name.includes("temp"))),
    ) ?? "custom";
  return {
    ...tag,
    role,
    label: tag.tagName.replace(/^\d+:/, ""),
    unit: roles[role],
    enabled: true,
  };
}

export default function TagMappingPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [equipmentId, setEquipmentId] = useState<string>();
  const [assets, setAssets] = useState<Equipment[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [siteId, setSiteId] = useState("");
  const [integrationId, setIntegrationId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("MOTOR");
  const [location, setLocation] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [readings, setReadings] = useState<PlcReading[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [readAt, setReadAt] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getAssets(), getIntegrations(), getSites()])
      .then(([records, connections, siteList]) => {
        if (!active) return;
        setAssets(records);
        setIntegrations(connections);
        setSites(siteList);
        const asset = (records as Equipment[]).find(
          (item) => item.id === params.get("assetId"),
        );
        const connection =
          connections.find(
            (item) =>
              item.id ===
              (asset?.tagMappings[0]?.integrationId ??
                params.get("integrationId")),
          ) ?? connections[0];
        if (asset) {
          setEquipmentId(asset.id);
          setName(asset.name);
          setType(asset.type);
          setLocation(asset.location ?? "");
          setDrafts(
            asset.tagMappings.map((item) => ({
              ...item,
              label: item.label || item.tagName,
              unit: item.unit ?? "",
              enabled: item.showAsMetric !== false,
            })),
          );
        }
        setIntegrationId(connection?.id ?? "");
        setSiteId(asset?.siteId ?? connection?.siteId ?? siteList[0]?.id ?? "");
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
  }, [params]);

  function loadDiscovered(id: string) {
    try {
      const stored = JSON.parse(
        localStorage.getItem("discoveredTags:" + user?.companyId + ":" + id) ??
          "[]",
      );
      if (!Array.isArray(stored)) return [];
      return stored
        .filter(
          (item) =>
            typeof item.tagName === "string" && typeof item.nodeId === "string",
        )
        .map(suggest);
    } catch {
      return [];
    }
  }
  // New equipment loads the tags selected in the OPC UA browser.
  useEffect(() => {
    if (!loading && !equipmentId && integrationId)
      setDrafts(loadDiscovered(integrationId));
  }, [loading, equipmentId, integrationId, user?.companyId]);

  function chooseIntegration(id: string) {
    setIntegrationId(id);
    setReadings([]);
    setDrafts(loadDiscovered(id));
  }
  function update(index: number, changes: Partial<Draft>) {
    setDrafts((current) =>
      current.map((item, i) => (i === index ? { ...item, ...changes } : item)),
    );
    setReadings([]);
  }
  function move(index: number, direction: number) {
    setDrafts((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  const metrics = drafts
    .filter((item) => item.enabled)
    .map((item, index) => ({ ...item, displaySlot: index + 1 }));
  async function readPreview() {
    setReading(true);
    setError("");
    setReadings([]);
    try {
      setReadings(
        await readEquipmentPreview(
          integrationId,
          metrics.map((item) => item.nodeId),
        ),
      );
      setReadAt(new Date().toLocaleTimeString());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read PLC");
    } finally {
      setReading(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const equipment = await saveEquipment({
        id: equipmentId,
        name,
        type,
        location,
        siteId,
        integrationId,
        mappings: metrics,
      });
      navigate("/equipment/" + equipment.id);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save equipment",
      );
    } finally {
      setBusy(false);
    }
  }
  const canEdit = ["OWNER", "ADMIN", "TECHNICIAN"].includes(user?.role ?? "");
  if (loading)
    return <main className="main">Loading equipment configuration...</main>;
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <Link className="text-sm text-cyan-300" to="/assets">
          ← Equipment
        </Link>
        <header className="my-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-cyan-300">
              Equipment setup
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              {equipmentId ? "Edit equipment" : "Build your equipment view"}
            </h1>
            <p className="mt-2 text-slate-400">
              Choose PLC tags, name your metrics and arrange the view.
            </p>
          </div>
          <button
            onClick={save}
            disabled={
              !canEdit ||
              busy ||
              reading ||
              !name.trim() ||
              !siteId ||
              !integrationId ||
              metrics.length === 0
            }
            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40"
          >
            <Save size={18} />
            {busy ? "Saving..." : "Save equipment"}
          </button>
        </header>
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300"
          >
            {error}
          </p>
        )}
        {!canEdit && (
          <p className="mb-5 text-amber-300">
            Your role can view equipment. Ask an owner or technician to change
            its configuration.
          </p>
        )}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,1fr)]">
          <fieldset
            disabled={busy || reading || !canEdit}
            className="min-w-0 space-y-6"
          >
            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-5 text-lg font-semibold">Equipment identity</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  Name
                  <input
                    className={input}
                    value={name}
                    maxLength={120}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Motor M205 · conveyor 2"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  Type
                  <select
                    className={input}
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {["MOTOR", "PUMP", "TANK", "VALVE", "SHAFT", "OTHER"].map(
                      (value) => (
                        <option key={value}>{value}</option>
                      ),
                    )}
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  Site
                  <select
                    className={input}
                    value={siteId}
                    onChange={(e) => {
                      setSiteId(e.target.value);
                      chooseIntegration("");
                    }}
                  >
                    <option value="">Select site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  PLC integration
                  <select
                    className={input}
                    value={integrationId}
                    onChange={(e) => chooseIntegration(e.target.value)}
                  >
                    <option value="">Select integration</option>
                    {integrations
                      .filter((item) => item.siteId === siteId)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm sm:col-span-2">
                  Location
                  <input
                    className={input}
                    value={location}
                    maxLength={256}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Production hall · line 2"
                  />
                </label>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">
                  Metrics · {metrics.length} selected
                </h2>
                <button
                  className="text-sm text-cyan-300"
                  onClick={() => {
                    const discovered = loadDiscovered(integrationId);
                    setDrafts((current) => [
                      ...current,
                      ...discovered.filter(
                        (tag) =>
                          !current.some((item) => item.nodeId === tag.nodeId),
                      ),
                    ]);
                  }}
                >
                  Import selected tags
                </button>
              </div>
              {drafts.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
                  Save a PLC integration and select its tags in{" "}
                  <Link to="/integrations" className="text-cyan-300">
                    OPC UA Browser
                  </Link>
                  , then return here.
                </p>
              )}
              <div className="space-y-4">
                {drafts.map((item, index) => (
                  <div
                    key={item.nodeId}
                    className={
                      "rounded-xl border p-4 " +
                      (item.enabled
                        ? "border-slate-600"
                        : "border-slate-800 opacity-60")
                    }
                  >
                    <div className="mb-4 flex items-start gap-3">
                      <input
                        aria-label={"Display " + item.tagName}
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) =>
                          update(index, { enabled: e.target.checked })
                        }
                        className="mt-1 accent-cyan-400"
                      />
                      <div className="min-w-0 flex-1">
                        <strong className="block break-all text-sm">
                          {item.tagName}
                        </strong>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {item.nodeId}
                        </p>
                      </div>
                      <button
                        aria-label={"Move " + item.tagName + " up"}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        className="text-cyan-300 disabled:opacity-20"
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button
                        aria-label={"Move " + item.tagName + " down"}
                        disabled={index === drafts.length - 1}
                        onClick={() => move(index, 1)}
                        className="text-cyan-300 disabled:opacity-20"
                      >
                        <ArrowDown size={18} />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_90px]">
                      <label className="grid gap-2 text-xs text-slate-400">
                        Display label
                        <input
                          value={item.label}
                          maxLength={120}
                          onChange={(e) =>
                            update(index, { label: e.target.value })
                          }
                          className={input}
                        />
                      </label>
                      <label className="grid gap-2 text-xs text-slate-400">
                        Metric meaning
                        <select
                          value={item.role}
                          onChange={(e) =>
                            update(index, {
                              role: e.target.value,
                              unit: roles[e.target.value],
                            })
                          }
                          className={input}
                        >
                          {Object.keys(roles).map((role) => (
                            <option key={role}>{role}</option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-xs text-slate-400">
                        Unit
                        <input
                          value={item.unit}
                          maxLength={32}
                          onChange={(e) =>
                            update(index, { unit: e.target.value })
                          }
                          className={input}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </fieldset>
          <aside className="min-w-0 lg:sticky lg:top-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Preview</h2>
              <button
                onClick={readPreview}
                disabled={
                  reading || busy || !integrationId || metrics.length === 0
                }
                className="flex items-center gap-2 text-sm text-cyan-300 disabled:opacity-40"
              >
                <RefreshCw
                  size={16}
                  className={reading ? "animate-spin" : ""}
                />
                {reading ? "Reading..." : "Read PLC values"}
              </button>
            </div>
            <EquipmentPreview
              name={name}
              type={type}
              location={location}
              metrics={metrics}
              readings={readings}
              caption={
                readings.length
                  ? "PLC values read at " + readAt
                  : "Layout preview · values have not been read yet"
              }
            />
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Use the arrows to arrange cards. Labels and units update
              immediately. Units are display labels; values are not converted.
            </p>
            {equipmentId && (
              <Link
                className="mt-5 block text-sm text-cyan-300"
                to={"/equipment/" + equipmentId}
              >
                Open saved equipment →
              </Link>
            )}
            {assets.length > 0 && (
              <p className="mt-5 text-xs text-slate-500">
                {assets.length} equipment records in your workspace
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
