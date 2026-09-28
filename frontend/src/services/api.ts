// src/services/api.ts
const API_URL = "http://localhost:3000";

export async function getOpenAlarms() {
  const res = await fetch(`${API_URL}/alarms/open`);
  return res.json();
}

export async function acknowledgeAlarm(id: string) {
  const res = await fetch(`${API_URL}/alarms/${id}/ack`, {
    method: "PATCH",
  });
  return res.json();
}

export async function resolveAlarm(id: string) {
  const res = await fetch(`${API_URL}/alarms/${id}/resolve`, {
    method: "PATCH",
  });
  return res.json();
}
// src/services/api.ts

export async function getAssets() {
  const res = await fetch(`${API_URL}/tag-mapping/assets`);
  return res.json();
}

export async function createAsset(data: {
  name: string;
  type: string;
  location?: string;
}) {
  const res = await fetch(`${API_URL}/tag-mapping/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function createTagMapping(data: any) {
  const res = await fetch(`${API_URL}/tag-mapping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function getTagMappings(assetId?: string) {
  const url = assetId
    ? `${API_URL}/tag-mapping?assetId=${assetId}`
    : `${API_URL}/tag-mapping`;

  const res = await fetch(url);
  return res.json();
}

// services/api.ts

export async function testOpcConnection(endpointUrl: string) {
  const token = localStorage.getItem("accessToken"); // използвай ключа от твоя login код

  const res = await fetch(`${API_URL}/integrations/opcua/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ endpointUrl }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function browseOpc(endpointUrl: string, nodeId: string) {
  const res = await fetch("http://localhost:3000/integrations/opcua/browse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpointUrl,
      nodeId,
    }),
  });

  return res.json();
}
