import { zoomHistoryRange } from "../utils/historyNavigation";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import {
  getAssets,
  getHistoryCatalog,
  getHistoryDetail,
  getHistoryRaw,
  type Equipment,
  type HistoryFile,
  type HistoryDetail,
} from "../services/api";
const colors = ["#38bdf8", "#a78bfa", "#fbbf24", "#34d399", "#fb7185"];
const iso = (n: number) => new Date(n).toISOString();
const clock = (n: number) => new Date(n).toISOString().slice(11, 19);
function download(name: string, data: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csv(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
function Dossier({
  assetId,
  day,
  onClose,
}: {
  assetId: string;
  day: string;
  onClose: () => void;
}) {
  const start = +new Date(day + "T00:00:00Z"),
    end = start + 86400000;
  const [range, setRange] = useState<[number, number]>([start, end]);
  const [data, setData] = useState<HistoryDetail | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [exporting, setExporting] = useState(false),
    [metric, setMetric] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const generation = useRef(0);
  const extent = useRef<[number, number] | null>(null);
  const autoFit = useRef(false);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      const chart =
        event.target instanceof Element
          ? event.target.closest("[data-history-chart]")
          : null;
      if (!chart || !event.deltaY) return;
      event.preventDefault();
      const rect = chart.getBoundingClientRect();
      const fraction = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width),
      );
      setRange((current) =>
        zoomHistoryRange(current, [start, end], event.deltaY, fraction),
      );
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [start, end]);

  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  useEffect(() => {
    let active = true;
    const g = ++generation.current;
    setBusy(true);

    setError("");
    const timer = setTimeout(() => {
      getHistoryDetail(assetId, iso(range[0]), iso(range[1]))
        .then((d) => {
          if (active && g === generation.current) {
            setData(d);
            if (!autoFit.current) {
              autoFit.current = true;
              if (d.samples.length) {
                const first = +new Date(d.samples[0].sampledAt);
                const last = +new Date(
                  d.samples[d.samples.length - 1].sampledAt,
                );
                const padding = Math.max(5000, (last - first) * 0.05);
                extent.current = [
                  Math.max(start, first - padding),
                  Math.min(end, last + padding),
                ];
                setRange(extent.current);
              }
            }
          }
        })
        .catch((e) => {
          if (active) {
            setError(e.message);
            setData(null);
          }
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [assetId, range]);
  const entries = new Map<string, string>();
  data?.samples.forEach((s) =>
    s.payload.readings.forEach((r) => {
      if (typeof r.value === "number") {
        const m = s.payload.mappings?.find((m) => m.nodeId === r.nodeId);
        entries.set(
          r.nodeId,
          (m?.label || m?.tagName || r.nodeId) +
            (m?.unit ? " (" + m.unit + ")" : ""),
        );
      }
    }),
  );
  const ids = [...entries.keys()].filter((id) => !metric || id === metric);
  const points: Array<Record<string, number | null>> = [];
  data?.samples.forEach((s, i) => {
    const t = +new Date(s.sampledAt);
    const prev = data.samples[i - 1];
    if (
      prev &&
      t - +new Date(prev.sampledAt) > Math.max(5000, data.bucketSeconds * 2000)
    )
      points.push({
        time: t - 1,
        ...Object.fromEntries(ids.map((id) => [id, null])),
      });
    points.push({
      time: t,
      ...Object.fromEntries(
        ids.map((id) => {
          const r = s.payload.readings.find((r) => r.nodeId === id);
          return [id, r?.good && typeof r.value === "number" ? r.value : null];
        }),
      ),
    });
  });
  function focus(t: number) {
    setRange([Math.max(start, t - 60000), Math.min(end, t + 60000)]);
  }
  async function exportRaw(format: "csv" | "json") {
    setExporting(true);
    setError("");
    const parts: string[] = [];
    let after: string | undefined;
    let first = true;
    if (format === "csv")
      parts.push(
        "sample_time_utc,node_id,value,good,status_code,source_time_utc\n",
      );
    else
      parts.push(
        JSON.stringify({
          assetId,
          from: iso(range[0]),
          to: iso(range[1]),
          timezone: "UTC",
          events: data?.events ?? [],
          eventsTruncated: data?.eventsTruncated ?? false,
        }).slice(0, -1) + ',\n"samples":[\n',
      );
    try {
      do {
        const page = await getHistoryRaw(
          assetId,
          iso(range[0]),
          iso(range[1]),
          after,
        );
        for (const s of page.rows) {
          if (format === "json") {
            parts.push((first ? "" : ",\n") + JSON.stringify(s));
            first = false;
          } else
            for (const r of s.payload.readings)
              parts.push(
                [
                  s.sampledAt,
                  r.nodeId,
                  typeof r.value === "object"
                    ? JSON.stringify(r.value)
                    : r.value,
                  r.good,
                  r.statusCode,
                  r.timestamp,
                ]
                  .map(csv)
                  .join(",") + "\n",
              );
        }
        after = page.nextAfter ?? undefined;
      } while (after);
      if (format === "json") parts.push("\n]}");
      download(
        `equipment-${assetId}-${day}.${format}`,
        parts.join(""),
        format === "csv" ? "text/csv;charset=utf-8" : "application/json",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      className="history-dialog rounded-2xl border border-slate-600 bg-slate-950 p-6 text-white backdrop:bg-black/70"
    >
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-xl">
          {data?.asset.name || "Equipment"} · {day} · UTC
        </h2>
        <button onClick={onClose} autoFocus className="text-cyan-300">
          Close ✕
        </button>
      </div>
      <div className="my-4 flex flex-wrap gap-4 history-controls">
        <button
          disabled={exporting || busy}
          onClick={() => void exportRaw("csv")}
        >
          Export raw CSV
        </button>
        <button
          disabled={exporting || busy}
          onClick={() => void exportRaw("json")}
        >
          Export raw JSON
        </button>
        <button disabled={!data || busy} onClick={() => window.print()}>
          Print / Save PDF
        </button>
        <button onClick={() => setRange([start, end])}>Full day</button>
        <button
          disabled={!extent.current}
          onClick={() => extent.current && setRange(extent.current)}
        >
          Fit recorded data
        </button>
        <button
          onClick={() =>
            setRange((current) =>
              zoomHistoryRange(current, [start, end], -1, 0.5),
            )
          }
        >
          Zoom +
        </button>
        <button
          onClick={() =>
            setRange((current) =>
              zoomHistoryRange(current, [start, end], 1, 0.5),
            )
          }
        >
          Zoom −
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      {busy && <p role="status">Loading selected period…</p>}
      {exporting && <p role="status">Exporting raw samples…</p>}
      <p>
        {clock(range[0])} – {range[1] === end ? "24:00:00" : clock(range[1])}{" "}
        UTC
      </p>
      <div className="history-controls my-4 grid gap-2">
        <label>
          From
          <input
            aria-label="Start of period"
            className="w-full"
            type="range"
            min={start}
            max={end - 1000}
            step={1000}
            value={range[0]}
            onChange={(e) =>
              setRange([Math.min(+e.target.value, range[1] - 1000), range[1]])
            }
          />
        </label>
        <label>
          To
          <input
            aria-label="End of period"
            className="w-full"
            type="range"
            min={start + 1000}
            max={end}
            step={1000}
            value={range[1]}
            onChange={(e) =>
              setRange([range[0], Math.max(+e.target.value, range[0] + 1000)])
            }
          />
        </label>
      </div>
      {data && (
        <>
          <p className="my-3 text-sm text-slate-400">
            {data.count} raw samples. Chart: last sample per{" "}
            {data.bucketSeconds}s bucket; short peaks may be omitted. Zoom in
            for detail or export raw data. All metrics share one scale. No
            readings means no evidence of normal operation.
          </p>
          <select
            aria-label="Chart metric"
            className="history-controls bg-slate-800 p-2"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            <option value="">All measurements</option>
            {[...entries].map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div data-history-chart>
              <p className="history-controls text-xs text-slate-400">
                Mouse wheel over the chart to zoom around the pointer. Scroll
                outside the chart to move the dialog.
              </p>
              {points.length ? (
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={points}>
                    <CartesianGrid stroke="#334155" />
                    <XAxis
                      dataKey="time"
                      type="number"
                      domain={[range[0], range[1]]}
                      tickFormatter={clock}
                    />
                    <YAxis />
                    <Tooltip labelFormatter={(v) => clock(Number(v))} />
                    {ids.map((id, i) => (
                      <Line
                        key={id}
                        dataKey={id}
                        name={entries.get(id)}
                        stroke={colors[i % colors.length]}
                        dot={false}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    ))}
                    {data.events.map((e) => (
                      <ReferenceLine
                        key={e.id}
                        x={+new Date(e.createdAt)}
                        stroke={
                          [
                            "CONFIRMED",
                            "ESCALATED",
                            "VERIFICATION_FAILED",
                          ].includes(e.kind)
                            ? "#ef4444"
                            : e.kind === "VERIFIED"
                              ? "#22c55e"
                              : "#f59e0b"
                        }
                        label="●"
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="p-8">No measurements in this period.</p>
              )}
            </div>
            <aside className="max-h-96 space-y-3 overflow-auto">
              <h3>Events in selected period</h3>
              {!data.events.length && <p>No recorded maintenance events.</p>}
              {data.eventsTruncated && (
                <p>First 2,000 events shown. Narrow the range to view more.</p>
              )}
              {data.events.map((e) => (
                <button
                  key={e.id}
                  className="block w-full rounded-lg border border-slate-700 p-3 text-left"
                  onClick={() => focus(+new Date(e.createdAt))}
                >
                  <strong>
                    {clock(+new Date(e.createdAt))} · {e.kind}
                  </strong>
                  <p>{e.message}</p>
                </button>
              ))}
            </aside>
          </div>
        </>
      )}
    </dialog>
  );
}
export default function HistoryPage() {
  const [params] = useSearchParams();
  const [assets, setAssets] = useState<Equipment[]>([]);
  const [asset, setAsset] = useState(params.get("assetId") || "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [files, setFiles] = useState<HistoryFile[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [selected, setSelected] = useState<HistoryFile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    getAssets()
      .then((a) => {
        if (active) setAssets(a);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setFiles([]);
    setNext(null);
    const timer = setTimeout(() => {
      getHistoryCatalog(search, page, asset)
        .then((result) => {
          if (active) {
            setFiles(result.files);
            setNext(result.nextPage);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, page, asset]);
  const matching = assets.filter((a) =>
    [a.name, a.location, a.type]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  return (
    <main className="main min-h-screen">
      <Link to="/dashboard" className="back-link">
        ← Dashboard
      </Link>
      <h1 className="my-4 text-2xl">Equipment dossiers</h1>
      <p className="mb-4 text-slate-400">
        Daily files in UTC. Search by equipment name, type or location.
        Recording requires automatic monitoring.
      </p>
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Search equipment dossiers"
          placeholder="Search name, type or location…"
          maxLength={120}
          className="rounded-lg bg-slate-800 p-3"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <select
          aria-label="Equipment"
          className="rounded-lg bg-slate-800 p-3"
          value={asset}
          onChange={(e) => {
            setAsset(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All equipment</option>
          {assets
            .filter(
              (a) => a.id === asset || matching.some((m) => m.id === a.id),
            )
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
        <button
          onClick={() => {
            setSearch("");
            setAsset("");
            setPage(0);
          }}
        >
          Clear filters
        </button>
      </div>
      <p className="my-3 text-sm text-slate-400">
        Page {page + 1} · up to 30 daily files per page
      </p>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      {loading && <p role="status">Loading dossiers…</p>}
      <div className="my-5 grid gap-4 md:grid-cols-3">
        {files.map((d) => (
          <button
            key={d.assetId + d.day}
            onClick={() => setSelected(d)}
            className="panel text-left"
          >
            <h2>{d.assetName}</h2>
            <p>▣ {d.day}</p>
            <p
              className={
                d.critical
                  ? "text-red-300"
                  : d.warning
                    ? "text-orange-300"
                    : "text-slate-300"
              }
            >
              {d.critical
                ? "Critical alarm recorded"
                : d.warning
                  ? "Warning recorded"
                  : "No confirmed alarm in recorded samples"}
            </p>
            <p>
              {d.samples} samples · {clock(+new Date(d.first))}–
              {clock(+new Date(d.last))} UTC
            </p>
            <p>
              {d.bad} samples with missing/bad data · {d.gaps} gaps over 5s
            </p>
          </button>
        ))}
      </div>
      {!loading && !error && !files.length && (
        <p>
          No dossiers match these filters. Equipment without recorded history
          has no daily files.
        </p>
      )}
      <div className="flex gap-4">
        <button
          disabled={loading || page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          ← Previous
        </button>
        <button
          disabled={loading || next === null}
          onClick={() => next !== null && setPage(next)}
        >
          Next →
        </button>
      </div>
      {selected && (
        <Dossier
          key={selected.assetId + selected.day}
          assetId={selected.assetId}
          day={selected.day}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
