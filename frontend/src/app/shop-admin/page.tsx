"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  createShopPurchase,
  createShopSale,
  deleteShopPurchase,
  deleteShopSale,
  getMe,
  getShopChartData,
  getShopDashboard,
  getShopInventory,
  getShopPurchases,
  getShopSales,
  InventoryItem,
  ShopChartData,
  ShopDashboard,
  ShopPurchase,
  ShopPurchaseFee,
  ShopPurchaseItem,
  ShopSale,
  ShopSaleItem,
  updateShopPurchase,
  updateShopSale,
} from "@/lib/api";

const money = (value: number) => `$${value.toFixed(2)}`;
const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-GB") : "—";
const parseAmount = (s: string): number => {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? 0 : Math.max(0, n);
};

type Tab = "sales" | "purchases" | "inventory" | "charts";

const emptySaleItem = (): ShopSaleItem => ({ item_name: "", quantity: 1, unit_price_usd: 0, total_price_usd: 0 });
const emptyPurchaseItem = (): ShopPurchaseItem => ({ item_name: "", quantity: 1, unit_cost_usd: 0, total_cost_usd: 0 });
const emptyFee = (): ShopPurchaseFee => ({ name: "", amount_usd: 0 });

const todayISO = () => new Date().toISOString().slice(0, 10);

const inputCls = "w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm";
const labelCls = "block text-xs text-gray-400 mb-1";

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: "#111827", border: "1px solid #374151", color: "#f3f4f6", borderRadius: 8 },
  labelStyle: { color: "#9ca3af" },
};

export default function ShopAdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sales");
  const [dashboard, setDashboard] = useState<ShopDashboard | null>(null);
  const [chartData, setChartData] = useState<ShopChartData | null>(null);
  const [sales, setSales] = useState<ShopSale[]>([]);
  const [purchases, setPurchases] = useState<ShopPurchase[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [error, setError] = useState("");

  // ----- sale form state -----
  const [saleItems, setSaleItems] = useState<ShopSaleItem[]>([emptySaleItem()]);
  const [saleMeta, setSaleMeta] = useState({
    customer_name: "", customer_contact: "", sale_date: todayISO(), notes: "",
  });
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);

  // ----- purchase form state -----
  const [purchaseItems, setPurchaseItems] = useState<ShopPurchaseItem[]>([emptyPurchaseItem()]);
  const [purchaseFees, setPurchaseFees] = useState<ShopPurchaseFee[]>([]);
  const [purchaseMeta, setPurchaseMeta] = useState({
    supplier: "", status: "paid" as "paid" | "in_transit" | "completed",
    purchase_date: todayISO(), notes: "",
  });
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(null);

  async function loadAll() {
    const [me, dash, chart, salesData, purchasesData, inventoryData] = await Promise.all([
      getMe(), getShopDashboard(), getShopChartData(),
      getShopSales(), getShopPurchases(), getShopInventory(),
    ]);
    if (!["admin", "superadmin"].includes(me.role)) return router.push("/");
    setDashboard(dash);
    setChartData(chart);
    setSales(salesData);
    setPurchases(purchasesData);
    setInventory(inventoryData);
  }

  useEffect(() => { loadAll().catch(() => router.push("/")); }, []);

  // ----- item helpers -----
  function updateSaleItem(index: number, patch: Partial<ShopSaleItem>) {
    setSaleItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, ...patch, total_price_usd: Number(((patch.quantity ?? item.quantity) * (patch.unit_price_usd ?? item.unit_price_usd)).toFixed(2)) }
          : item
      )
    );
  }

  function updatePurchaseItem(index: number, patch: Partial<ShopPurchaseItem>) {
    setPurchaseItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, ...patch, total_cost_usd: Number(((patch.quantity ?? item.quantity) * (patch.unit_cost_usd ?? item.unit_cost_usd)).toFixed(2)) }
          : item
      )
    );
  }

  function updateFee(index: number, patch: Partial<ShopPurchaseFee>) {
    setPurchaseFees((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  // ----- submit handlers -----
  async function submitSale() {
    setError("");
    try {
      const payload = {
        ...saleMeta,
        sale_date: saleMeta.sale_date || null,
        items: saleItems,
      };
      if (editingSaleId) await updateShopSale(editingSaleId, payload);
      else await createShopSale(payload);
      setSaleItems([emptySaleItem()]);
      setSaleMeta({ customer_name: "", customer_contact: "", sale_date: todayISO(), notes: "" });
      setEditingSaleId(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save sale");
    }
  }

  async function submitPurchase() {
    setError("");
    try {
      const payload = {
        ...purchaseMeta,
        purchase_date: purchaseMeta.purchase_date || null,
        items: purchaseItems,
        fees: purchaseFees.filter((f) => f.name.trim()),
      };
      if (editingPurchaseId) await updateShopPurchase(editingPurchaseId, payload);
      else await createShopPurchase(payload);
      setPurchaseItems([emptyPurchaseItem()]);
      setPurchaseFees([]);
      setPurchaseMeta({ supplier: "", status: "paid", purchase_date: todayISO(), notes: "" });
      setEditingPurchaseId(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save purchase");
    }
  }

  function cancelSaleEdit() {
    setEditingSaleId(null);
    setSaleItems([emptySaleItem()]);
    setSaleMeta({ customer_name: "", customer_contact: "", sale_date: todayISO(), notes: "" });
  }

  function cancelPurchaseEdit() {
    setEditingPurchaseId(null);
    setPurchaseItems([emptyPurchaseItem()]);
    setPurchaseFees([]);
    setPurchaseMeta({ supplier: "", status: "paid", purchase_date: todayISO(), notes: "" });
  }

  if (!dashboard) return <main className="min-h-screen bg-gray-950 text-gray-100 p-6">Loading...</main>;

  const goodsTotal = purchaseItems.reduce((s, i) => s + i.total_cost_usd, 0);
  const feesTotal = purchaseFees.reduce((s, f) => s + (f.amount_usd || 0), 0);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-500">Shop Admin</p>
            <h1 className="text-3xl font-black">Sales / Purchases / Inventory</h1>
          </div>
          <button onClick={() => router.push("/")} className="px-4 py-2 rounded-lg border border-gray-700 hover:border-yellow-500">← Back</button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([["Cash", dashboard.cash_usd], ["Sales", dashboard.sales_usd], ["Profit", dashboard.profit_usd], ["Purchases", dashboard.purchases_usd]] as [string, number][]).map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
              <p className="mt-2 text-2xl font-black text-yellow-400">{money(value)}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["sales", "purchases", "inventory", "charts"] as Tab[]).map((item) => (
            <button key={item} onClick={() => setTab(item)} className={`px-4 py-2 rounded-lg border ${tab === item ? "border-yellow-500 bg-yellow-500/10 text-yellow-400" : "border-gray-800 bg-gray-900 text-gray-300"}`}>
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>

        {error && <div className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}

        {/* ===== SALES TAB ===== */}
        {tab === "sales" && (
          <section className="grid lg:grid-cols-[480px,1fr] gap-6">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-3">
              <h2 className="text-lg font-bold">{editingSaleId ? "Edit sale" : "Add sale"}</h2>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Customer name</label>
                  <input value={saleMeta.customer_name} onChange={(e) => setSaleMeta({ ...saleMeta, customer_name: e.target.value })} className={inputCls} placeholder="Name" />
                </div>
                <div>
                  <label className={labelCls}>Sale date</label>
                  <input type="date" value={saleMeta.sale_date} onChange={(e) => setSaleMeta({ ...saleMeta, sale_date: e.target.value })} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Contact</label>
                <input value={saleMeta.customer_contact} onChange={(e) => setSaleMeta({ ...saleMeta, customer_contact: e.target.value })} className={inputCls} placeholder="Phone / Telegram" />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={saleMeta.notes} onChange={(e) => setSaleMeta({ ...saleMeta, notes: e.target.value })} className={`${inputCls} min-h-[60px]`} />
              </div>

              <div className="space-y-3">
                {saleItems.map((item, index) => (
                  <div key={index} className="rounded-xl border border-gray-800 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Item #{index + 1}</p>
                      {saleItems.length > 1 && <button onClick={() => setSaleItems((prev) => prev.filter((_, i) => i !== index))} className="text-red-400 text-xs">Remove</button>}
                    </div>
                    <input placeholder="Item name" value={item.item_name} onChange={(e) => updateSaleItem(index, { item_name: e.target.value })} className={inputCls} />
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className={labelCls}>Qty</label><input type="number" min={1} value={item.quantity} onChange={(e) => updateSaleItem(index, { quantity: Number(e.target.value) })} className={inputCls} /></div>
                      <div><label className={labelCls}>Unit $</label><input type="text" inputMode="decimal" defaultValue={item.unit_price_usd} key={`su-${index}-${editingSaleId}`} onBlur={(e) => updateSaleItem(index, { unit_price_usd: parseAmount(e.target.value) })} className={inputCls} placeholder="0.00" /></div>
                      <div><label className={labelCls}>Total $</label><input type="text" inputMode="decimal" defaultValue={item.total_price_usd} key={`st-${index}-${editingSaleId}`} onBlur={(e) => updateSaleItem(index, { total_price_usd: parseAmount(e.target.value) })} className={inputCls} placeholder="0.00" /></div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => setSaleItems((prev) => [...prev, emptySaleItem()])} className="px-3 py-1.5 rounded-lg border border-gray-700 text-sm">+ Add item</button>
              <div className="text-sm text-gray-400">Total: <span className="text-yellow-400 font-semibold">{money(saleItems.reduce((s, i) => s + i.total_price_usd, 0))}</span></div>

              <div className="flex gap-2">
                <button onClick={submitSale} className="px-4 py-2 rounded-lg bg-yellow-500 text-gray-950 font-bold text-sm">Save</button>
                {editingSaleId && <button onClick={cancelSaleEdit} className="px-4 py-2 rounded-lg border border-gray-700 text-sm">Cancel</button>}
              </div>
            </div>

            {/* Sales table */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-400 border-b border-gray-800">
                  <tr><th className="p-3">Customer</th><th>Items</th><th>Total</th><th>Sale date</th><th></th></tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-800/70 align-top">
                      <td className="p-3">
                        {sale.customer_name}
                        <div className="text-xs text-gray-500">{sale.customer_contact ?? "—"}</div>
                      </td>
                      <td className="p-3">{sale.items.map((item) => <div key={item.id ?? `${item.item_name}-${item.quantity}`}>{item.item_name} × {item.quantity}</div>)}</td>
                      <td className="p-3 whitespace-nowrap">{money(sale.total_price_usd)}</td>
                      <td className="p-3 whitespace-nowrap text-gray-400">{fmt(sale.sale_date ?? sale.created_at)}</td>
                      <td className="pr-3 p-3 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => {
                          setEditingSaleId(sale.id);
                          setSaleMeta({ customer_name: sale.customer_name, customer_contact: sale.customer_contact ?? "", sale_date: sale.sale_date ?? sale.created_at.slice(0, 10), notes: sale.notes ?? "" });
                          setSaleItems(sale.items.map((item) => ({ item_name: item.item_name, quantity: item.quantity, unit_price_usd: item.unit_price_usd, total_price_usd: item.total_price_usd })));
                          setTab("sales");
                        }} className="text-yellow-400">Edit</button>
                        <button onClick={async () => { await deleteShopSale(sale.id); await loadAll(); }} className="text-red-400">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ===== PURCHASES TAB ===== */}
        {tab === "purchases" && (
          <section className="grid lg:grid-cols-[500px,1fr] gap-6">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-3">
              <h2 className="text-lg font-bold">{editingPurchaseId ? "Edit purchase" : "Add purchase"}</h2>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Supplier</label>
                  <input value={purchaseMeta.supplier} onChange={(e) => setPurchaseMeta({ ...purchaseMeta, supplier: e.target.value })} className={inputCls} placeholder="Supplier name" />
                </div>
                <div>
                  <label className={labelCls}>Purchase date</label>
                  <input type="date" value={purchaseMeta.purchase_date} onChange={(e) => setPurchaseMeta({ ...purchaseMeta, purchase_date: e.target.value })} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Status</label>
                <select value={purchaseMeta.status} onChange={(e) => setPurchaseMeta({ ...purchaseMeta, status: e.target.value as "paid" | "in_transit" | "completed" })} className={inputCls}>
                  <option value="paid">Paid</option>
                  <option value="in_transit">In transit</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={purchaseMeta.notes} onChange={(e) => setPurchaseMeta({ ...purchaseMeta, notes: e.target.value })} className={`${inputCls} min-h-[60px]`} />
              </div>

              {/* Goods items */}
              <div className="space-y-3">
                {purchaseItems.map((item, index) => (
                  <div key={index} className="rounded-xl border border-gray-800 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Item #{index + 1}</p>
                      {purchaseItems.length > 1 && <button onClick={() => setPurchaseItems((prev) => prev.filter((_, i) => i !== index))} className="text-red-400 text-xs">Remove</button>}
                    </div>
                    <input placeholder="Item name" value={item.item_name} onChange={(e) => updatePurchaseItem(index, { item_name: e.target.value })} className={inputCls} />
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className={labelCls}>Qty</label><input type="number" min={1} value={item.quantity} onChange={(e) => updatePurchaseItem(index, { quantity: Number(e.target.value) })} className={inputCls} /></div>
                      <div><label className={labelCls}>Unit $</label><input type="text" inputMode="decimal" defaultValue={item.unit_cost_usd} key={`pu-${index}-${editingPurchaseId}`} onBlur={(e) => updatePurchaseItem(index, { unit_cost_usd: parseAmount(e.target.value) })} className={inputCls} placeholder="0.00" /></div>
                      <div><label className={labelCls}>Total $</label><input type="text" inputMode="decimal" defaultValue={item.total_cost_usd} key={`pt-${index}-${editingPurchaseId}`} onBlur={(e) => updatePurchaseItem(index, { total_cost_usd: parseAmount(e.target.value) })} className={inputCls} placeholder="0.00" /></div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setPurchaseItems((prev) => [...prev, emptyPurchaseItem()])} className="px-3 py-1.5 rounded-lg border border-gray-700 text-sm">+ Add item</button>

              {/* Service fees */}
              <div className="border-t border-gray-800 pt-3 space-y-2">
                <p className="text-sm font-semibold text-gray-300">Service fees</p>
                {purchaseFees.map((fee, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input placeholder="Fee name (e.g. Transport)" value={fee.name} onChange={(e) => updateFee(index, { name: e.target.value })} className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                    <input type="text" inputMode="decimal" placeholder="0.00" defaultValue={fee.amount_usd || ""} key={`fee-${index}-${editingPurchaseId}`} onBlur={(e) => updateFee(index, { amount_usd: parseAmount(e.target.value) })} className="w-24 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
                    <button onClick={() => setPurchaseFees((prev) => prev.filter((_, i) => i !== index))} className="text-red-400 text-lg leading-none px-1">×</button>
                  </div>
                ))}
                <button onClick={() => setPurchaseFees((prev) => [...prev, emptyFee()])} className="px-3 py-1.5 rounded-lg border border-dashed border-gray-600 text-sm text-gray-400">+ Add fee</button>
              </div>

              <div className="space-y-1 text-sm text-gray-400 border-t border-gray-800 pt-3">
                <div className="flex justify-between"><span>Goods total</span><span>{money(goodsTotal)}</span></div>
                {feesTotal > 0 && <div className="flex justify-between"><span>Fees total</span><span>{money(feesTotal)}</span></div>}
                <div className="flex justify-between font-semibold text-yellow-400"><span>Grand total</span><span>{money(goodsTotal + feesTotal)}</span></div>
              </div>

              <div className="flex gap-2">
                <button onClick={submitPurchase} className="px-4 py-2 rounded-lg bg-yellow-500 text-gray-950 font-bold text-sm">Save</button>
                {editingPurchaseId && <button onClick={cancelPurchaseEdit} className="px-4 py-2 rounded-lg border border-gray-700 text-sm">Cancel</button>}
              </div>
            </div>

            {/* Purchases table */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-400 border-b border-gray-800">
                  <tr><th className="p-3">Supplier</th><th>Items</th><th>Goods</th><th>Fees</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="border-b border-gray-800/70 align-top">
                      <td className="p-3">{purchase.supplier ?? "—"}</td>
                      <td className="p-3">{purchase.items.map((item) => <div key={item.id ?? `${item.item_name}-${item.quantity}`}>{item.item_name} × {item.quantity}</div>)}</td>
                      <td className="p-3 whitespace-nowrap">{money(purchase.goods_total_usd)}</td>
                      <td className="p-3">
                        {purchase.fees.length > 0
                          ? purchase.fees.map((f, i) => <div key={i} className="text-xs text-gray-400">{f.name}: {money(f.amount_usd)}</div>)
                          : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="p-3 whitespace-nowrap font-semibold">{money(purchase.total_cost_usd)}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${purchase.status === "completed" ? "bg-green-900/50 text-green-400" : purchase.status === "in_transit" ? "bg-blue-900/50 text-blue-400" : "bg-gray-800 text-gray-400"}`}>
                          {purchase.status}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-gray-400">{fmt(purchase.purchase_date ?? purchase.created_at)}</td>
                      <td className="pr-3 p-3 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => {
                          setEditingPurchaseId(purchase.id);
                          setPurchaseMeta({ supplier: purchase.supplier ?? "", status: purchase.status, purchase_date: purchase.purchase_date ?? purchase.created_at.slice(0, 10), notes: purchase.notes ?? "" });
                          setPurchaseItems(purchase.items.map((item) => ({ item_name: item.item_name, quantity: item.quantity, unit_cost_usd: item.unit_cost_usd, total_cost_usd: item.total_cost_usd })));
                          setPurchaseFees(purchase.fees.map((f) => ({ name: f.name, amount_usd: f.amount_usd })));
                          setTab("purchases");
                        }} className="text-yellow-400">Edit</button>
                        <button onClick={async () => { await deleteShopPurchase(purchase.id); await loadAll(); }} className="text-red-400">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ===== INVENTORY TAB ===== */}
        {tab === "inventory" && (
          <section className="rounded-2xl border border-gray-800 bg-gray-900 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-400 border-b border-gray-800">
                <tr><th className="p-3">Item</th><th>Quantity</th><th>Total cost</th><th>Avg cost</th><th>Updated</th></tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id} className="border-b border-gray-800/70">
                    <td className="p-3">{item.item_name}</td>
                    <td className="p-3">{item.quantity}</td>
                    <td className="p-3">{money(item.total_cost_usd)}</td>
                    <td className="p-3">{money(item.avg_cost_usd)}</td>
                    <td className="p-3 text-gray-400">{fmt(item.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ===== CHARTS TAB ===== */}
        {tab === "charts" && chartData && (
          <section className="space-y-6">

            {/* Monthly revenue overview */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h2 className="text-base font-semibold mb-4 text-gray-200">Monthly Overview</h2>
              {chartData.monthly.length === 0 ? (
                <p className="text-sm text-gray-500">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData.monthly} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [`$${Number(value).toFixed(2)}`]} />
                    <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 13 }} />
                    <Bar dataKey="sales" name="Sales" fill="#eab308" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="purchases" name="Purchases" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Inventory stock value */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h2 className="text-base font-semibold mb-1 text-gray-200">Stock Value by Item</h2>
              <p className="text-xs text-gray-500 mb-4">
                Total: {money(chartData.inventory.reduce((s, i) => s + i.value, 0))}
                {" · "}{chartData.inventory.reduce((s, i) => s + i.quantity, 0)} units
              </p>
              {chartData.inventory.length === 0 ? (
                <p className="text-sm text-gray-500">Inventory is empty.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, chartData.inventory.length * 38)}>
                  <BarChart data={chartData.inventory} layout="vertical" margin={{ top: 0, right: 60, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="item_name" width={160} tick={{ fill: "#d1d5db", fontSize: 12 }} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [`$${Number(value).toFixed(2)}`, "Stock value"]} />
                    <Bar dataKey="value" name="Stock value ($)" fill="#a855f7" radius={[0, 4, 4, 0]}
                      label={{ position: "right", fill: "#9ca3af", fontSize: 11, formatter: (v: unknown) => `$${Number(v).toFixed(0)}` }} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

          </section>
        )}

      </div>
    </main>
  );
}
