"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createShopPurchase,
  createShopSale,
  deleteShopPurchase,
  deleteShopSale,
  getMe,
  getShopDashboard,
  getShopInventory,
  getShopPurchases,
  getShopSales,
  InventoryItem,
  ShopDashboard,
  ShopPurchase,
  ShopPurchaseItem,
  ShopSale,
  ShopSaleItem,
  updateShopPurchase,
  updateShopSale,
} from "@/lib/api";

const money = (value: number) => `$${value.toFixed(2)}`;
const date = (value: string) => new Date(value).toLocaleDateString("en-GB");

type Tab = "sales" | "purchases" | "inventory";

const emptySaleItem = (): ShopSaleItem => ({ item_name: "", quantity: 1, unit_price_usd: 0, total_price_usd: 0 });
const emptyPurchaseItem = (): ShopPurchaseItem => ({ item_name: "", quantity: 1, unit_cost_usd: 0, total_cost_usd: 0 });

export default function ShopAdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sales");
  const [dashboard, setDashboard] = useState<ShopDashboard | null>(null);
  const [sales, setSales] = useState<ShopSale[]>([]);
  const [purchases, setPurchases] = useState<ShopPurchase[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [saleItems, setSaleItems] = useState<ShopSaleItem[]>([emptySaleItem()]);
  const [purchaseItems, setPurchaseItems] = useState<ShopPurchaseItem[]>([emptyPurchaseItem()]);
  const [saleMeta, setSaleMeta] = useState({ customer_name: "", customer_contact: "", notes: "" });
  const [purchaseMeta, setPurchaseMeta] = useState({ supplier: "", status: "paid" as "paid" | "in_transit" | "completed", transport_cost_usd: 0, commission_cost_usd: 0, notes: "" });
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadAll() {
    const [me, dash, salesData, purchasesData, inventoryData] = await Promise.all([
      getMe(), getShopDashboard(), getShopSales(), getShopPurchases(), getShopInventory(),
    ]);
    if (!["admin", "superadmin"].includes(me.role)) return router.push("/");
    setDashboard(dash);
    setSales(salesData);
    setPurchases(purchasesData);
    setInventory(inventoryData);
  }

  useEffect(() => { loadAll().catch(() => router.push("/")); }, []);

  function updateSaleItem(index: number, patch: Partial<ShopSaleItem>) {
    setSaleItems((prev) => prev.map((item, i) => i === index ? { ...item, ...patch, total_price_usd: Number((((patch.quantity ?? item.quantity) * (patch.unit_price_usd ?? item.unit_price_usd))).toFixed(2)) } : item));
  }

  function updatePurchaseItem(index: number, patch: Partial<ShopPurchaseItem>) {
    setPurchaseItems((prev) => prev.map((item, i) => i === index ? { ...item, ...patch, total_cost_usd: Number((((patch.quantity ?? item.quantity) * (patch.unit_cost_usd ?? item.unit_cost_usd))).toFixed(2)) } : item));
  }

  async function submitSale() {
    setError("");
    try {
      const payload = { ...saleMeta, items: saleItems };
      if (editingSaleId) await updateShopSale(editingSaleId, payload);
      else await createShopSale(payload);
      setSaleItems([emptySaleItem()]);
      setSaleMeta({ customer_name: "", customer_contact: "", notes: "" });
      setEditingSaleId(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save sale");
    }
  }

  async function submitPurchase() {
    setError("");
    try {
      const payload = { ...purchaseMeta, items: purchaseItems };
      if (editingPurchaseId) await updateShopPurchase(editingPurchaseId, payload);
      else await createShopPurchase(payload);
      setPurchaseItems([emptyPurchaseItem()]);
      setPurchaseMeta({ supplier: "", status: "paid", transport_cost_usd: 0, commission_cost_usd: 0, notes: "" });
      setEditingPurchaseId(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save purchase");
    }
  }

  if (!dashboard) return <main className="min-h-screen bg-gray-950 text-gray-100 p-6">Loading...</main>;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-500">Shop Admin</p>
            <h1 className="text-3xl font-black">Sales / Purchases / Inventory</h1>
          </div>
          <button onClick={() => router.push("/")} className="px-4 py-2 rounded-lg border border-gray-700 hover:border-yellow-500">← Back</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[ ["Cash", dashboard.cash_usd], ["Sales", dashboard.sales_usd], ["Profit", dashboard.profit_usd], ["Purchases", dashboard.purchases_usd] ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-gray-800 bg-gray-900 p-4"><p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p><p className="mt-2 text-2xl font-black text-yellow-400">{money(Number(value))}</p></div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["sales", "purchases", "inventory"] as Tab[]).map((item) => <button key={item} onClick={() => setTab(item)} className={`px-4 py-2 rounded-lg border ${tab === item ? "border-yellow-500 bg-yellow-500/10 text-yellow-400" : "border-gray-800 bg-gray-900 text-gray-300"}`}>{item[0].toUpperCase() + item.slice(1)}</button>)}
        </div>

        {error && <div className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}

        {tab === "sales" && (
          <section className="grid lg:grid-cols-[460px,1fr] gap-6">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-3">
              <h2 className="text-lg font-bold">{editingSaleId ? "Edit sale" : "Add sale"}</h2>
              <input placeholder="Customer name" value={saleMeta.customer_name} onChange={(e) => setSaleMeta({ ...saleMeta, customer_name: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              <input placeholder="Customer contact" value={saleMeta.customer_contact} onChange={(e) => setSaleMeta({ ...saleMeta, customer_contact: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              <textarea placeholder="Notes" value={saleMeta.notes} onChange={(e) => setSaleMeta({ ...saleMeta, notes: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 min-h-[80px]" />
              <div className="space-y-3">
                {saleItems.map((item, index) => (
                  <div key={index} className="rounded-xl border border-gray-800 p-3 space-y-2">
                    <div className="flex items-center justify-between"><p className="text-sm font-semibold">Item #{index + 1}</p>{saleItems.length > 1 && <button onClick={() => setSaleItems((prev) => prev.filter((_, i) => i !== index))} className="text-red-400 text-sm">Remove</button>}</div>
                    <input placeholder="Item name" value={item.item_name} onChange={(e) => updateSaleItem(index, { item_name: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" min={1} value={item.quantity} onChange={(e) => updateSaleItem(index, { quantity: Number(e.target.value) })} className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
                      <input type="number" min={0} step="0.01" value={item.unit_price_usd} onChange={(e) => updateSaleItem(index, { unit_price_usd: Number(e.target.value) })} className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
                      <input type="number" min={0} step="0.01" value={item.total_price_usd} onChange={(e) => updateSaleItem(index, { total_price_usd: Number(e.target.value) })} className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setSaleItems((prev) => [...prev, emptySaleItem()])} className="px-4 py-2 rounded-lg border border-gray-700">+ Add item</button>
              <div className="text-sm text-gray-400">Total: {money(saleItems.reduce((sum, item) => sum + item.total_price_usd, 0))}</div>
              <div className="flex gap-2"><button onClick={submitSale} className="px-4 py-2 rounded-lg bg-yellow-500 text-gray-950 font-bold">Save</button>{editingSaleId && <button onClick={() => { setEditingSaleId(null); setSaleItems([emptySaleItem()]); setSaleMeta({ customer_name: "", customer_contact: "", notes: "" }); }} className="px-4 py-2 rounded-lg border border-gray-700">Cancel</button>}</div>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-auto">
              <table className="w-full text-sm"><thead className="text-left text-gray-400 border-b border-gray-800"><tr><th className="p-3">Customer</th><th>Items</th><th>Total</th><th>Date</th><th></th></tr></thead><tbody>{sales.map((sale) => (<tr key={sale.id} className="border-b border-gray-800/70 align-top"><td className="p-3">{sale.customer_name}<div className="text-xs text-gray-500">{sale.customer_contact ?? "—"}</div></td><td>{sale.items.map((item) => <div key={item.id ?? `${item.item_name}-${item.quantity}`}>{item.item_name} × {item.quantity}</div>)}</td><td>{money(sale.total_price_usd)}</td><td>{date(sale.created_at)}</td><td className="pr-3 text-right space-x-2"><button onClick={() => { setEditingSaleId(sale.id); setSaleMeta({ customer_name: sale.customer_name, customer_contact: sale.customer_contact ?? "", notes: sale.notes ?? "" }); setSaleItems(sale.items.map((item) => ({ item_name: item.item_name, quantity: item.quantity, unit_price_usd: item.unit_price_usd, total_price_usd: item.total_price_usd }))); }} className="text-yellow-400">Edit</button><button onClick={async () => { await deleteShopSale(sale.id); await loadAll(); }} className="text-red-400">Delete</button></td></tr>))}</tbody></table>
            </div>
          </section>
        )}

        {tab === "purchases" && (
          <section className="grid lg:grid-cols-[460px,1fr] gap-6">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-3">
              <h2 className="text-lg font-bold">{editingPurchaseId ? "Edit purchase" : "Add purchase"}</h2>
              <input placeholder="Supplier" value={purchaseMeta.supplier} onChange={(e) => setPurchaseMeta({ ...purchaseMeta, supplier: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              <select value={purchaseMeta.status} onChange={(e) => setPurchaseMeta({ ...purchaseMeta, status: e.target.value as "paid" | "in_transit" | "completed" })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2"><option value="paid">paid</option><option value="in_transit">in_transit</option><option value="completed">completed</option></select>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min={0} step="0.01" placeholder="Transport USD" value={purchaseMeta.transport_cost_usd} onChange={(e) => setPurchaseMeta({ ...purchaseMeta, transport_cost_usd: Number(e.target.value) })} className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
                <input type="number" min={0} step="0.01" placeholder="Commission USD" value={purchaseMeta.commission_cost_usd} onChange={(e) => setPurchaseMeta({ ...purchaseMeta, commission_cost_usd: Number(e.target.value) })} className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              </div>
              <textarea placeholder="Notes" value={purchaseMeta.notes} onChange={(e) => setPurchaseMeta({ ...purchaseMeta, notes: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 min-h-[80px]" />
              <div className="space-y-3">
                {purchaseItems.map((item, index) => (
                  <div key={index} className="rounded-xl border border-gray-800 p-3 space-y-2">
                    <div className="flex items-center justify-between"><p className="text-sm font-semibold">Item #{index + 1}</p>{purchaseItems.length > 1 && <button onClick={() => setPurchaseItems((prev) => prev.filter((_, i) => i !== index))} className="text-red-400 text-sm">Remove</button>}</div>
                    <input placeholder="Item name" value={item.item_name} onChange={(e) => updatePurchaseItem(index, { item_name: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" min={1} value={item.quantity} onChange={(e) => updatePurchaseItem(index, { quantity: Number(e.target.value) })} className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
                      <input type="number" min={0} step="0.01" value={item.unit_cost_usd} onChange={(e) => updatePurchaseItem(index, { unit_cost_usd: Number(e.target.value) })} className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
                      <input type="number" min={0} step="0.01" value={item.total_cost_usd} onChange={(e) => updatePurchaseItem(index, { total_cost_usd: Number(e.target.value) })} className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setPurchaseItems((prev) => [...prev, emptyPurchaseItem()])} className="px-4 py-2 rounded-lg border border-gray-700">+ Add item</button>
              <div className="text-sm text-gray-400">Goods total: {money(purchaseItems.reduce((sum, item) => sum + item.total_cost_usd, 0))}</div>
              <div className="flex gap-2"><button onClick={submitPurchase} className="px-4 py-2 rounded-lg bg-yellow-500 text-gray-950 font-bold">Save</button>{editingPurchaseId && <button onClick={() => { setEditingPurchaseId(null); setPurchaseItems([emptyPurchaseItem()]); setPurchaseMeta({ supplier: "", status: "paid", transport_cost_usd: 0, commission_cost_usd: 0, notes: "" }); }} className="px-4 py-2 rounded-lg border border-gray-700">Cancel</button>}</div>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-auto">
              <table className="w-full text-sm"><thead className="text-left text-gray-400 border-b border-gray-800"><tr><th className="p-3">Supplier</th><th>Items</th><th>Goods</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>{purchases.map((purchase) => (<tr key={purchase.id} className="border-b border-gray-800/70 align-top"><td className="p-3">{purchase.supplier ?? "—"}</td><td>{purchase.items.map((item) => <div key={item.id ?? `${item.item_name}-${item.quantity}`}>{item.item_name} × {item.quantity}</div>)}</td><td>{money(purchase.goods_total_usd)}</td><td>{purchase.status}</td><td>{date(purchase.created_at)}</td><td className="pr-3 text-right space-x-2"><button onClick={() => { setEditingPurchaseId(purchase.id); setPurchaseMeta({ supplier: purchase.supplier ?? "", status: purchase.status, transport_cost_usd: purchase.transport_cost_usd, commission_cost_usd: purchase.commission_cost_usd, notes: purchase.notes ?? "" }); setPurchaseItems(purchase.items.map((item) => ({ item_name: item.item_name, quantity: item.quantity, unit_cost_usd: item.unit_cost_usd, total_cost_usd: item.total_cost_usd }))); }} className="text-yellow-400">Edit</button><button onClick={async () => { await deleteShopPurchase(purchase.id); await loadAll(); }} className="text-red-400">Delete</button></td></tr>))}</tbody></table>
            </div>
          </section>
        )}

        {tab === "inventory" && (
          <section className="rounded-2xl border border-gray-800 bg-gray-900 overflow-auto">
            <table className="w-full text-sm"><thead className="text-left text-gray-400 border-b border-gray-800"><tr><th className="p-3">Item</th><th>Quantity</th><th>Total cost</th><th>Avg cost</th><th>Updated</th></tr></thead><tbody>{inventory.map((item) => (<tr key={item.id} className="border-b border-gray-800/70"><td className="p-3">{item.item_name}</td><td>{item.quantity}</td><td>{money(item.total_cost_usd)}</td><td>{money(item.avg_cost_usd)}</td><td>{date(item.updated_at)}</td></tr>))}</tbody></table>
          </section>
        )}
      </div>
    </main>
  );
}
