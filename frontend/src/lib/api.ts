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
  telegram: string | null;
  email: string | null;
  product: string | null;
  order_summary: string | null;
  source: string;
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

export function updateAdminLead(leadId: number, data: {
  name?: string;
  phone?: string;
  telegram?: string;
  order_summary?: string;
  notes?: string;
  status?: string;
}): Promise<{ id: number; name: string | null; phone: string | null; telegram: string | null; order_summary: string | null; status: string; notes: string | null }> {
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

export type Payer = "cubed" | "vlad";

export interface ShopDashboard {
  cash_usd: number;
  sales_usd: number;
  profit_usd: number;
  purchases_usd: number;
  cubed_cash_usd: number;
  vlad_cash_usd: number;
}

export interface ShopPurchaseItem {
  id?: number;
  item_name: string;
  quantity: number;
  unit_cost_usd: number;
  total_cost_usd: number;
  paid_by?: Payer | null;
}

export interface ShopPurchaseFee {
  id?: number;
  name: string;
  amount_usd: number;
  paid_by?: Payer | null;
}

export interface ShopPurchase {
  id: number;
  items: ShopPurchaseItem[];
  fees: ShopPurchaseFee[];
  goods_total_usd: number;
  fees_total_usd: number;
  total_cost_usd: number;
  supplier: string | null;
  status: "paid" | "in_transit" | "completed";
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopSaleItem {
  id?: number;
  item_name: string;
  quantity: number;
  unit_price_usd: number;
  total_price_usd: number;
  cogs_usd?: number;
}

export interface ShopSaleFee {
  id?: number;
  name: string;
  amount_usd: number;
  received_by?: Payer | null;
}

export interface ShopSale {
  id: number;
  items: ShopSaleItem[];
  fees: ShopSaleFee[];
  items_total_usd: number;
  fees_total_usd: number;
  total_price_usd: number;
  customer_name: string;
  customer_contact: string | null;
  notes: string | null;
  cogs_usd: number;
  sale_date: string | null;
  received_by: Payer | null;
  created_at: string;
  updated_at: string;
}

export interface ShopChartMonthly {
  month: string;
  sales: number;
  purchases: number;
  profit: number;
}

export interface ShopChartInventoryItem {
  item_name: string;
  value: number;
  quantity: number;
}

export interface ShopChartData {
  monthly: ShopChartMonthly[];
  inventory: ShopChartInventoryItem[];
}

export interface InventoryItem {
  id: number;
  item_name: string;
  quantity: number;
  total_cost_usd: number;
  avg_cost_usd: number;
  updated_at: string;
}

export function getShopDashboard(): Promise<ShopDashboard> {
  return api.get("/admin/shop/dashboard");
}

export function getShopChartData(): Promise<ShopChartData> {
  return api.get("/admin/shop/chart-data");
}

export function getShopSales(): Promise<ShopSale[]> {
  return api.get("/admin/shop/sales");
}

export function createShopSale(data: { items: ShopSaleItem[]; fees: ShopSaleFee[]; customer_name: string; customer_contact?: string; sale_date?: string | null; notes?: string; received_by?: Payer | null }): Promise<ShopSale> {
  return api.authPost("/admin/shop/sales", data);
}

export function updateShopSale(id: number, data: { items: ShopSaleItem[]; fees: ShopSaleFee[]; customer_name: string; customer_contact?: string; sale_date?: string | null; notes?: string; received_by?: Payer | null }): Promise<ShopSale> {
  return request(`/admin/shop/sales/${id}`, { method: "PATCH", body: JSON.stringify(data), headers: authHeader() });
}

export function deleteShopSale(id: number): Promise<void> {
  return api.authDelete(`/admin/shop/sales/${id}`);
}

export function getShopPurchases(): Promise<ShopPurchase[]> {
  return api.get("/admin/shop/purchases");
}

export function createShopPurchase(data: { items: ShopPurchaseItem[]; fees: ShopPurchaseFee[]; supplier?: string; status: "paid" | "in_transit" | "completed"; purchase_date?: string | null; notes?: string }): Promise<ShopPurchase> {
  return api.authPost("/admin/shop/purchases", data);
}

export function updateShopPurchase(id: number, data: { items: ShopPurchaseItem[]; fees: ShopPurchaseFee[]; supplier?: string; status: "paid" | "in_transit" | "completed"; purchase_date?: string | null; notes?: string }): Promise<ShopPurchase> {
  return request(`/admin/shop/purchases/${id}`, { method: "PATCH", body: JSON.stringify(data), headers: authHeader() });
}


export function deleteShopPurchase(id: number): Promise<void> {
  return api.authDelete(`/admin/shop/purchases/${id}`);
}

export function getShopInventory(): Promise<InventoryItem[]> {
  return api.get("/admin/shop/inventory");
}

export interface IOYRecord {
  id: number;
  debtor: Payer;
  creditor: Payer;
  item_name: string;
  quantity: number;
  ioy_date: string | null;
  notes: string | null;
  settled: boolean;
  created_at: string;
  updated_at: string;
}

export function getIOYRecords(): Promise<IOYRecord[]> {
  return api.get("/admin/shop/ioy");
}

export function createIOYRecord(data: { debtor: Payer; creditor: Payer; item_name: string; quantity: number; ioy_date?: string | null; notes?: string | null; settled?: boolean }): Promise<IOYRecord> {
  return api.authPost("/admin/shop/ioy", data);
}

export function updateIOYRecord(id: number, data: { debtor: Payer; creditor: Payer; item_name: string; quantity: number; ioy_date?: string | null; notes?: string | null; settled?: boolean }): Promise<IOYRecord> {
  return request(`/admin/shop/ioy/${id}`, { method: "PATCH", body: JSON.stringify(data), headers: authHeader() });
}

export function deleteIOYRecord(id: number): Promise<void> {
  return api.authDelete(`/admin/shop/ioy/${id}`);
}

export async function saveTraining(packCount: number, laps: number[], startedAt?: string): Promise<void> {
  await api.authPost("/sessions/", {
    pack_count: packCount,
    laps,
    started_at: startedAt ?? new Date().toISOString(),
  });
}
