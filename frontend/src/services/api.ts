const API_URL = "http://localhost:3000";

export type AuthUser = { id: string; email: string; name?: string | null; role: string; companyId?: string | null };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export const getCurrentUser = () => request<AuthUser>("/auth/me");
export const login = (email: string, password: string) =>
  request<{ user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
export const register = (data: { email: string; password: string; name: string; companyName: string }) =>
  request<{ user: AuthUser }>("/auth/register", { method: "POST", body: JSON.stringify(data) });
export const logout = () => request<{ ok: boolean }>("/auth/logout", { method: "POST" });

export const getOpenAlarms = () => request<any[]>("/alarms/open");
export const acknowledgeAlarm = (id: string) => request<any>(`/alarms/${id}/ack`, { method: "PATCH" });
export const resolveAlarm = (id: string) => request<any>(`/alarms/${id}/resolve`, { method: "PATCH" });
export const getAssets = () => request<any[]>("/tag-mapping/assets");
export const createAsset = (data: { name: string; type: string; location?: string }) =>
  request<any>("/tag-mapping/assets", { method: "POST", body: JSON.stringify(data) });
export const createTagMapping = (data: any) =>
  request<any>("/tag-mapping", { method: "POST", body: JSON.stringify(data) });
export const getTagMappings = (assetId?: string) =>
  request<any[]>(`/tag-mapping${assetId ? `?assetId=${encodeURIComponent(assetId)}` : ""}`);

export const testOpcConnection = (endpointUrl: string) =>
  request<{ ok: boolean; message?: string }>("/integrations/opcua/test", {
    method: "POST", body: JSON.stringify({ endpointUrl }),
  });
export const browseOpc = (endpointUrl: string, nodeId: string) =>
  request<any[]>("/integrations/opcua/browse", {
    method: "POST", body: JSON.stringify({ endpointUrl, nodeId }),
  });

export type Site = { id: string; name: string; city?: string | null; country?: string | null };
export type Company = { id: string; name: string; industry?: string | null; description?: string | null; sites: Site[] };
export const getMyCompany = () => request<Company>("/companies/me");
export const getSites = () => request<Site[]>("/sites");
export const createSite = (name: string, city: string) =>
  request<Site>("/sites", { method: "POST", body: JSON.stringify({ name, city }) });
export type PlatformOverview = {
  counts: { companies: number; users: number; sites: number; integrations: number };
  companies: Array<{ id: string; name: string; createdAt: string; _count: { users: number; sites: number; integrations: number } }>;
};
export const getPlatformOverview = () => request<PlatformOverview>("/platform-admin/overview");
