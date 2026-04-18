const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { headers: extraHeaders, ...rest } = init ?? {};
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(extraHeaders as Record<string, string>) },
    ...rest,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),

  get: <T>(path: string) =>
    request<T>(path, { headers: authHeader() }),

  authPost: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), headers: authHeader() }),

  authPut: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body), headers: authHeader() }),

  authDelete: (path: string) =>
    request<void>(path, { method: "DELETE", headers: authHeader() }),
};

export interface PilotInfo {
  id: number;
  callsign: string;
  real_name: string | null;
  avatar_url: string | null;
}

export interface AdminUser {
  id: number;
  email: string;
  role: string;
  created_at: string;
  callsign: string | null;
}

export interface AdminSession {
  id: number;
  pack_count: number;
  started_at: string;
  ended_at: string | null;
  laps: { lap_number: number; duration_ms: number }[];
}

export function getMe(): Promise<{ id: number; email: string; role: string }> {
  return api.get("/auth/me");
}

export interface AdminLead {
  id: number;
  conversation_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  product: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminLeadMessage {
  id: number;
  sender: string;
  text: string;
  created_at: string;
}

export interface AdminLeadDetail extends AdminLead {
  messages: AdminLeadMessage[];
}

export function getAdminUsers(): Promise<AdminUser[]> {
  return api.get("/admin/users");
}

export function getAdminUserSessions(userId: number): Promise<AdminSession[]> {
  return api.get(`/admin/users/${userId}/sessions`);
}

export function getAdminLeads(): Promise<AdminLead[]> {
  return api.get("/admin/leads");
}

export function getAdminLead(leadId: number): Promise<AdminLeadDetail> {
  return api.get(`/admin/leads/${leadId}`);
}

export function updateAdminLead(leadId: number, data: { status?: string; notes?: string }): Promise<{ id: number; status: string; notes: string | null }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/admin/leads/${leadId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  }).then(res => {
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  });
}

export async function saveTraining(packCount: number, laps: number[], startedAt?: string): Promise<void> {
  await api.authPost("/sessions/", {
    pack_count: packCount,
    laps,
    started_at: startedAt ?? new Date().toISOString(),
  });
}
