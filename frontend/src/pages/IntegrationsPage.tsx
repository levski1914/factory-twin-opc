import { useState } from "react";
import {
  ArrowLeft,
  Cpu,
  Database,
  FolderTree,
  PlugZap,
  RefreshCw,
  Send,
  Wifi,
} from "lucide-react";
import { browseOpc, testOpcConnection } from "../services/api";
import { Link } from "react-router-dom";

export default function IntegrationsPage() {
  const [endpointUrl, setEndpointUrl] = useState(
    "opc.tcp://192.168.11.10:4840",
  );
  const [connected, setConnected] = useState(false);
  const [statusText, setStatusText] = useState("Not connected");
  const [rootTags, setRootTags] = useState<any[]>([]);
  const [nodes, setNodes] = useState<Record<string, any[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loadingNode, setLoadingNode] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedNodes, setSelectedNodes] = useState<Record<string, any>>({});

  function isMatch(node: any) {
    const q = search.toLowerCase().trim();
    if (!q) return true;

    return (
      node.name?.toLowerCase().includes(q) ||
      node.nodeId?.toLowerCase().includes(q)
    );
  }

  function toggleSelect(node: any) {
    setSelectedNodes((prev) => {
      const next = { ...prev };

      if (next[node.nodeId]) {
        delete next[node.nodeId];
      } else {
        next[node.nodeId] = node;
      }

      return next;
    });
  }

  function sendSelectedToMapping() {
    const existing = JSON.parse(localStorage.getItem("discoveredTags") ?? "[]");

    const selected = Object.values(selectedNodes).map((node: any) => ({
      tagName: node.name.replace("3:", ""),
      nodeId: node.nodeId,
    }));

    const merged = [
      ...existing,
      ...selected.filter(
        (tag: any) => !existing.some((item: any) => item.nodeId === tag.nodeId),
      ),
    ];

    localStorage.setItem("discoveredTags", JSON.stringify(merged));
    setSelectedNodes({});

    alert(`${selected.length} tags sent to mapping`);
  }
  async function handleTest() {
    setStatusText("Connecting...");

    try {
      const res = await testOpcConnection(endpointUrl);
      setConnected(Boolean(res.ok));
      setStatusText(
        res.ok ? "Connected" : (res.message ?? "Connection failed"),
      );
    } catch (error) {
      setConnected(false);
      setStatusText(
        error instanceof Error ? error.message : "Connection failed",
      );
    }
  }

  async function browseStart(nodeId: string) {
    setLoadingNode(nodeId);
    try {
      setRootTags(await browseOpc(endpointUrl, nodeId));
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Browse failed");
    } finally {
      setLoadingNode(null);
    }
  }

  async function toggleNode(node: any) {
    const isOpen = expanded[node.nodeId];

    setExpanded((prev) => ({
      ...prev,
      [node.nodeId]: !isOpen,
    }));

    if (!nodes[node.nodeId]) {
      setLoadingNode(node.nodeId);
      try {
        const children = await browseOpc(endpointUrl, node.nodeId);
        setNodes((prev) => ({ ...prev, [node.nodeId]: children }));
      } catch (error) {
        setStatusText(error instanceof Error ? error.message : "Browse failed");
      } finally {
        setLoadingNode(null);
      }
    }
  }

  function sendToMapping(node: any) {
    const existing = JSON.parse(localStorage.getItem("discoveredTags") ?? "[]");

    const tag = {
      tagName: node.name.replace("3:", ""),
      nodeId: node.nodeId,
    };

    const exists = existing.some((item: any) => item.nodeId === tag.nodeId);

    const next = exists ? existing : [...existing, tag];

    localStorage.setItem("discoveredTags", JSON.stringify(next));

    alert("Tag sent to mapping");
  }

  function renderNode(node: any, level = 0) {
    const children = nodes[node.nodeId] ?? [];
    const isExpanded = expanded[node.nodeId];
    const isLoading = loadingNode === node.nodeId;
    const isVariable = node.nodeClass === "2";
    if (!isMatch(node) && !children.some(isMatch)) return null;
    const isSelected = !!selectedNodes[node.nodeId];
    return (
      <div key={node.nodeId}>
        <div
          className="group grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 transition hover:border-cyan-500/50 hover:bg-slate-800/80"
          style={{ marginLeft: `${level * 24}px` }}
        >
          <button
            type="button"
            onClick={() => toggleNode(node)}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-cyan-300">
              {isLoading ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : isExpanded ? (
                "▾"
              ) : (
                "▸"
              )}
            </span>

            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
              {isVariable ? <Cpu size={18} /> : <FolderTree size={18} />}
            </span>
            {isVariable && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(node)}
                className="h-4 w-4 accent-cyan-400"
              />
            )}
            <span>
              <strong className="block text-sm text-white">{node.name}</strong>
              <span className="block text-xs text-sky-300">{node.nodeId}</span>
            </span>
          </button>

          {isVariable && (
            <button
              onClick={() => sendToMapping(node)}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 px-3 py-2 text-sm text-cyan-200 transition hover:bg-cyan-500/10"
            >
              <Send size={15} />
              Send to Mapping
            </button>
          )}
        </div>

        {isExpanded && children.length > 0 && (
          <div className="mt-2 space-y-2">
            {children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <Link to="/dashboard" className="back-link">
        <ArrowLeft size={18} />
        Back to dashboard
      </Link>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold">OPC UA Integrations</h1>
          <p className="mt-2 text-sm text-sky-300">
            Connect, browse PLC namespaces and send useful tags to mapping
          </p>
        </div>

        <div
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            connected
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-slate-600 bg-slate-800 text-slate-300"
          }`}
        >
          {statusText}
        </div>
      </header>

      <section className="mb-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-lg shadow-black/20">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
            <PlugZap size={21} />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Connection</h2>
            <p className="text-sm text-slate-400">
              Siemens S7 / OPC UA endpoint
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            value={endpointUrl}
            onChange={(e) => setEndpointUrl(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
          />

          <button
            onClick={handleTest}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            <Wifi size={17} />
            Test Connection
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => browseStart("ns=0;i=85")}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-sky-200 hover:bg-slate-800"
          >
            Browse Root
          </button>

          <button
            onClick={() => browseStart("ns=3;s=PLC")}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-sky-200 hover:bg-slate-800"
          >
            Browse PLC
          </button>

          <button
            onClick={() => browseStart("ns=3;s=DataBlocksGlobal")}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-sky-200 hover:bg-slate-800"
          >
            Browse DBs
          </button>

          <button
            onClick={() => browseStart('ns=3;s="Server"')}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-sky-200 hover:bg-slate-800"
          >
            Browse Server DB
          </button>
        </div>
      </section>
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tags by name or nodeId..."
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
        />

        <button
          onClick={() => setSelectedNodes({})}
          className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-sky-200 hover:bg-slate-800"
        >
          Clear Selection
        </button>

        <button
          onClick={sendSelectedToMapping}
          disabled={Object.keys(selectedNodes).length === 0}
          className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
        >
          Send Selected ({Object.keys(selectedNodes).length})
        </button>
      </div>
      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-lg shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
              <Database size={21} />
            </span>
            <div>
              <h2 className="text-lg font-semibold">OPC UA Browser</h2>
              <p className="text-sm text-slate-400">
                Expand nodes until you reach PLC variables
              </p>
            </div>
          </div>

          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-sky-300">
            {rootTags.length} root nodes
          </span>
        </div>

        <div className="space-y-2">
          {rootTags.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
              Choose a browse action to load OPC UA nodes.
            </div>
          ) : (
            rootTags.map((tag) => renderNode(tag))
          )}
        </div>
      </section>
    </main>
  );
}
