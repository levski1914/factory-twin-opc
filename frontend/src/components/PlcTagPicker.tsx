import { useEffect, useRef, useState } from "react";
import {
  browseOpc,
  readEquipmentPreview,
  type Integration,
} from "../services/api";
type Tag = { nodeId: string; tagName: string };
type Node = { nodeId: string; name: string; nodeClass: string | number };
export default function PlcTagPicker({
  integration,
  onAdd,
}: {
  integration: Integration;
  onAdd: (tag: Tag) => void;
}) {
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [path, setPath] = useState([{ nodeId: "ns=0;i=85", name: "Objects" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [tagName, setTagName] = useState("");
  async function browse(next: typeof path) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await browseOpc(
        integration.endpointUrl,
        next[next.length - 1].nodeId,
      );
      setNodes(data);
      setPath(next);
      setQuery("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Browse failed");
    } finally {
      setBusy(false);
    }
  }
  function add(tag: Tag) {
    if (!active.current) return;
    onAdd(tag);
    setNotice(
      "Added: " +
        tag.tagName +
        ". Select it in an alarm or enable its metric card, then Save equipment.",
    );
  }
  async function addManual() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const [reading] = await readEquipmentPreview(integration.id, [
        nodeId.trim(),
      ]);
      if (!reading?.good)
        throw new Error(
          reading?.statusCode || "Tag cannot be read from this PLC",
        );
      add({ nodeId: nodeId.trim(), tagName: tagName.trim() || nodeId.trim() });
      setNodeId("");
      setTagName("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Tag validation failed",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Add more PLC tags</h2>
        <p className="text-sm text-slate-400">
          {integration.name} · {integration.endpointUrl}
        </p>
        <p className="text-sm text-slate-400">
          Browse any folder or DB exposed by this PLC. Adding tags keeps your
          current equipment settings.
        </p>
      </div>
      <button
        type="button"
        disabled={busy}
        className="text-cyan-300"
        onClick={() => void browse([{ nodeId: "ns=0;i=85", name: "Objects" }])}
      >
        {busy ? "Reading…" : "Browse PLC tags"}
      </button>
      <div className="flex flex-wrap gap-2">
        {path.map((part, index) => (
          <button
            type="button"
            disabled={busy}
            className="text-sm text-sky-300"
            key={index}
            onClick={() => void browse(path.slice(0, index + 1))}
          >
            {index ? " / " : ""}
            {part.name}
          </button>
        ))}
      </div>
      <input
        aria-label="Filter tags in this folder"
        className="w-full rounded-lg bg-slate-950 p-3"
        placeholder="Filter this folder…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="max-h-72 space-y-2 overflow-auto">
        {nodes
          .filter((n) =>
            (n.name + " " + n.nodeId)
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((node) => (
            <div
              key={node.nodeId}
              className="flex items-center gap-3 rounded-lg border border-slate-700 p-3"
            >
              <div className="min-w-0 flex-1">
                <strong className="break-all text-sm">{node.name}</strong>
                <p className="break-all text-xs text-slate-400">
                  {node.nodeId}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                className="text-sm text-sky-300"
                onClick={() =>
                  void browse([
                    ...path,
                    { nodeId: node.nodeId, name: node.name },
                  ])
                }
              >
                Open
              </button>
              {String(node.nodeClass) === "2" && (
                <button
                  type="button"
                  disabled={busy}
                  className="text-cyan-300"
                  onClick={() =>
                    add({
                      nodeId: node.nodeId,
                      tagName: node.name.replace(/^\d+:/, ""),
                    })
                  }
                >
                  + Add
                </button>
              )}
            </div>
          ))}
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-cyan-300">
          Add by exact OPC UA NodeId
        </summary>
        <div className="mt-3 grid gap-3">
          <input
            aria-label="Tag name"
            maxLength={256}
            className="rounded-lg bg-slate-950 p-3"
            placeholder="Tag name (optional)"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
          />
          <input
            aria-label="OPC UA NodeId"
            maxLength={1024}
            className="rounded-lg bg-slate-950 p-3"
            placeholder='ns=3;s="DB_Motors"."Motor1"."Fault"'
            value={nodeId}
            onChange={(e) => setNodeId(e.target.value)}
          />
          <button
            type="button"
            disabled={busy || !nodeId.trim()}
            className="text-left text-cyan-300"
            onClick={() => void addManual()}
          >
            Check and add tag
          </button>
        </div>
      </details>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-green-300">
          {notice}
        </p>
      )}
    </section>
  );
}
