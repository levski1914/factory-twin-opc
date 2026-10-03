export type EquipmentPassport = {
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  reference?: string;
  ratedPowerKw?: number;
  ratedCurrentA?: number;
  maxTemperatureC?: number;
};
const API_URL = "http://localhost:3000";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  companyId?: string | null;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : (data?.message ?? `HTTP ${response.status}`);
    throw new Error(message);
  }
  return data as T;
}

export const getCurrentUser = () => request<AuthUser>("/auth/me");
export const login = (email: string, password: string) =>
  request<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
export const register = (data: {
  email: string;
  password: string;
  name: string;
  companyName: string;
}) =>
  request<{ user: AuthUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const logout = () =>
  request<{ ok: boolean }>("/auth/logout", { method: "POST" });

export const getOpenAlarms = () => request<any[]>("/alarms/open");
export const acknowledgeAlarm = (id: string) =>
  request<any>(`/alarms/${id}/ack`, { method: "PATCH" });
export const resolveAlarm = (id: string) =>
  request<any>(`/alarms/${id}/resolve`, { method: "PATCH" });
export const getAssets = () => request<any[]>("/tag-mapping/assets");
export const createAsset = (data: {
  name: string;
  type: string;
  location?: string;
}) =>
  request<any>("/tag-mapping/assets", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const createTagMapping = (data: any) =>
  request<any>("/tag-mapping", { method: "POST", body: JSON.stringify(data) });
export const getTagMappings = (assetId?: string) =>
  request<any[]>(
    `/tag-mapping${assetId ? `?assetId=${encodeURIComponent(assetId)}` : ""}`,
  );

export const testOpcConnection = (endpointUrl: string) =>
  request<{ ok: boolean; message?: string }>("/integrations/opcua/test", {
    method: "POST",
    body: JSON.stringify({ endpointUrl }),
  });
export const browseOpc = (endpointUrl: string, nodeId: string) =>
  request<any[]>("/integrations/opcua/browse", {
    method: "POST",
    body: JSON.stringify({ endpointUrl, nodeId }),
  });

export type Site = {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
};
export type Company = {
  id: string;
  name: string;
  industry?: string | null;
  description?: string | null;
  sites: Site[];
};
export const getMyCompany = () => request<Company>("/companies/me");
export const getSites = () => request<Site[]>("/sites");
export const createSite = (name: string, city: string) =>
  request<Site>("/sites", {
    method: "POST",
    body: JSON.stringify({ name, city }),
  });
export type PlatformOverview = {
  counts: {
    companies: number;
    users: number;
    sites: number;
    integrations: number;
  };
  companies: Array<{
    id: string;
    name: string;
    createdAt: string;
    _count: { users: number; sites: number; integrations: number };
  }>;
};
export const getPlatformOverview = () =>
  request<PlatformOverview>("/platform-admin/overview");

export type Integration = {
  id: string;
  name: string;
  endpointUrl: string;
  siteId: string;
  companyId: string;
};
export type Metric = {
  tagName: string;
  nodeId: string;
  role: string;
  label: string;
  unit: string;
  displaySlot?: number;
  showAsMetric?: boolean;
};
export type AlarmRule = {
  delaySeconds?: number;
  clearSeconds?: number;
  resetThreshold?: number;
  name: string;
  nodeId: string;
  tagName: string;
  integrationId: string;
  condition: "TRUE" | "FALSE" | "GT" | "LT" | "EQ" | "BIT_SET";
  threshold: number;
  severity: "WARNING" | "CRITICAL";
};
export type Equipment = {
  monitoring?: MonitoringConfig;
  passport?: EquipmentPassport;
  alarmRules?: AlarmRule[];
  id: string;
  name: string;
  type: string;
  location?: string;
  siteId: string;
  site?: Site;
  tagMappings: Array<Metric & { integrationId: string }>;
};
export type PlcReading = {
  nodeId: string;
  value: unknown;
  good: boolean;
  statusCode: string;
  timestamp: string | null;
};
export const getIntegrations = () => request<Integration[]>("/integrations");
export const saveIntegration = (data: {
  name: string;
  endpointUrl: string;
  siteId: string;
}) =>
  request<Integration>("/integrations", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const saveEquipment = (data: {
  id?: string;
  name: string;
  type: string;
  location: string;
  siteId: string;
  integrationId: string;
  mappings: Metric[];
  monitoring?: MonitoringConfig;
  passport?: EquipmentPassport;
  alarmRules?: AlarmRule[];
}) =>
  request<Equipment>("/tag-mapping/equipment", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const readEquipmentPreview = (
  integrationId: string,
  nodeIds: string[],
) =>
  request<PlcReading[]>("/tag-mapping/preview", {
    method: "POST",
    body: JSON.stringify({ integrationId, nodeIds }),
  });

export const deleteIntegration = (id: string) =>
  request<{ ok: boolean }>("/integrations/" + encodeURIComponent(id), {
    method: "DELETE",
  });

export type MonitoringConfig = {
  enabled: boolean;
  runNodeId: string;
  runCondition: "TRUE" | "GT";
  runThreshold: number;
  loadNodeId: string;
  minimumLoad: number;
  verificationSeconds: number;
};
export type MonitorRuleState = {
  key: string;
  name: string;
  severity: string;
  state: string;
  latched: boolean;
  progressSeconds: number;
  delaySeconds: number;
};
export type MonitorSnapshot = {
  assetId: string;
  sampleAt: number;
  stale: boolean;
  readings: PlcReading[];
  rules: MonitorRuleState[];
  operating: boolean | null;
  verification: string;
  error: string | null;
};
export type MaintenanceCase = {
  id: string;
  assetId: string;
  assetName: string;
  status: string;
  severity: string;
  assigneeId: string | null;
  assigneeName: string | null;
  reportedName: string | null;
  reportNote: string | null;
  createdAt: string;
  reportedAt: string | null;
  verificationSince: string | null;
};
export type MonitorOverview = {
  serverTime: number;
  snapshots: MonitorSnapshot[];
  cases: MaintenanceCase[];
  notifications: Array<{
    id: string;
    caseId: string;
    message: string;
    readAt: string | null;
    createdAt: string;
  }>;
};
export type MaintenanceEvent = {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
  evidence: unknown;
};
export const getMonitoring = () => request<MonitorOverview>("/monitoring");
export const getMaintenanceCase = (id: string) =>
  request<{ task: MaintenanceCase; events: MaintenanceEvent[] }>(
    "/monitoring/cases/" + encodeURIComponent(id),
  );
export const updateMaintenanceCase = (
  id: string,
  data: { action: "CLAIM" | "REPORT"; note?: string; repairAction?: string },
) =>
  request<MaintenanceCase>("/monitoring/cases/" + encodeURIComponent(id), {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const readMonitorNotification = (id: string) =>
  request("/monitoring/notifications/" + encodeURIComponent(id) + "/read", {
    method: "PATCH",
  });
