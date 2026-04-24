"use client";

import { useEffect, useMemo, useState } from "react";
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
  ShopSale,
  updateShopPurchase,
  updateShopSale,
} from "@/lib/api";

const money = (value: number) => `$${value.toFixed(2)}`;
const date = (value: string) => new Date(value).toLocaleDateString("en-GB");

type Tab = "sales" | "purchases" | "inventory";

const emptySale = {
  item_name: "",
  quantity: 1,
  unit_price_usd: 0,
  total_price_usd: 0,
  customer_name: "",
  customer_contact: "",
  notes: "",
};

const emptyPurchase: {
  item_name: string;
  quantity: number;
  unit_cost_usd: number;
  total_cost_usd: number;
  transport_cost_usd: number;
  commission_cost_usd: number;
  supplier: string;
  status: "paid" | "in_transit" | "completed";
  notes: string;
} = {
  item_name: "",
  quantity: 1,
  unit_cost_usd: 0,
  total_cost_usd: 0,
  transport_cost_usd: 0,
  commission_cost_usd: 0,
  supplier: "",
  status: "paid",
  notes: "",
};

export default function ShopAdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sales");
  const [dashboard, setDashboard] = useState<ShopDashboard | null>(null);
  const [sales, setSales] = useState<ShopSale[]>([]);
  const [purchases, setPurchases] = useState<ShopPurchase[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [saleForm, setSaleForm] = useState(emptySale);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchase);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadAll() {
    const [me, dash, salesData, purchasesData, inventoryData] = await Promise.all([
      getMe(),
      getShopDashboard(),
      getShopSales(),
      getShopPurchases(),
      getShopInventory(),
    ]);
    if (!["admin", "superadmin"].includes(me.role)) {
      router.push("/");
      return;
    }
    setDashboard(dash);
    setSales(salesData);
    setPurchases(purchasesData);
    setInventory(inventoryData);
  }

  useEffect(() => {
    loadAll().catch(() => router.push("/"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSaleForm((prev) => ({ ...prev, total_price_usd: Number((prev.quantity * prev.unit_price_usd).toFixed(2)) }));
  }, [saleForm.quantity, saleForm.unit_price_usd]);

  useEffect(() => {
    setPurchaseForm((prev) => ({ ...prev, total_cost_usd: Number((prev.quantity * prev.unit_cost_usd).toFixed(2)) }));
  }, [purchaseForm.quantity, purchaseForm.unit_cost_usd]);

  const inventoryOptions = useMemo(() => inventory.map((item) => item.item_name), [inventory]);

  async function submitSale() {
    setError("");
    try {
      if (editingSaleId) {
        await updateShopSale(editingSaleId, saleForm);
      } else {
        await createShopSale(saleForm);
      }
      setSaleForm(emptySale);
      setEditingSaleId(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save sale");
    }
  }

  async function submitPurchase() {
    setError("");
    try {
      if (editingPurchaseId) {
        await updateShopPurchase(editingPurchaseId, purchaseForm);
      } else {
        await createShopPurchase(purchaseForm);
      }
      setPurchaseForm(emptyPurchase);
      setEditingPurchaseId(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save purchase");
    }
  }

  if (!dashboard) {
    return <main className="min-h-screen bg-gray-950 text-gray-100 p-6">Loading...</main>;
  }

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
          {[
            ["Cash", dashboard.cash_usd],
            ["Sales", dashboard.sales_usd],
            ["Profit", dashboard.profit_usd],
            ["Purchases", dashboard.purchases_usd],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
              <p className="mt-2 text-2xl font-black text-yellow-400">{money(Number(value))}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["sales", "purchases", "inventory"] as Tab[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`px-4 py-2 rounded-lg border ${tab === item ? "border-yellow-500 bg-yellow-500/10 text-yellow-400" : "border-gray-800 bg-gray-900 text-gray-300"}`}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>

        {error && <div className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}

        {tab === "sales" && (
          <section className="grid lg:grid-cols-[380px,1fr] gap-6">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-3">
              <h2 className="text-lg font-bold">{editingSaleId ? "Edit sale" : "Add sale"}</h2>
              <input list="inventory-items" placeholder="Item name" value={saleForm.item_name} onChange={(e) => setSaleForm({ ...saleForm, item_name: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              <datalist id="inventory-items">{inventoryOptions.map((name) => <option key={name} value={name} />)}</datalist>
              <input type="number" min={1} placeholder="Quantity" value={saleForm.quantity} onChange={(e) => setSaleForm({ ...saleForm, quantity: Number(e.target.value) })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              <input type="number" min={0} step="0.01" placeholder="Unit price USD" value={saleForm.unit_price_usd} onChange={(e) => setSaleForm({ ...saleForm, unit_price_usd: Number(e.target.value) })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              <input placeholder="Customer name" value={saleForm.customer_name} onChange={(e) => setSaleForm({ ...saleForm, customer_name: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              <input placeholder="Customer contact" value={saleForm.customer_contact} onChange={(e) => setSaleForm({ ...saleForm, customer_contact: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              <textarea placeholder="Notes" value={saleForm.notes} onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 min-h-[96px]" />
              <div className="text-sm text-gray-400">Total: {money(saleForm.total_price_usd)}</div>
              <div className="flex gap-2">
                <button onClick={submitSale} className="px-4 py-2 rounded-lg bg-yellow-500 text-gray-950 font-bold">Save</button>
                {editingSaleId && <button onClick={() => { setEditingSaleId(null); setSaleForm(emptySale); }} className="px-4 py-2 rounded-lg border border-gray-700">Cancel</button>}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-400 border-b border-gray-800"><tr><th className="p-3">Item</th><th>Qty</th><th>Unit</th><th>Total</th><th>Customer</th><th>Contact</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-800/70">
                      <td className="p-3">{sale.item_name}</td><td>{sale.quantity}</td><td>{money(sale.unit_price_usd)}</td><td>{money(sale.total_price_usd)}</td><td>{sale.customer_name}</td><td>{sale.customer_contact ?? "—"}</td><td>{date(sale.created_at)}</td>
                      <td className="pr-3 text-right space-x-2">
                        <button onClick={() => { setEditingSaleId(sale.id); setSaleForm({ item_name: sale.item_name, quantity: sale.quantity, unit_price_usd: sale.unit_price_usd, total_price_usd: sale.total_price_usd, customer_name: sale.customer_name, customer_contact: sale.customer_contact ?? "", notes: sale.notes ?? "" }); }} className="text-yellow-400">Edit</button>
                        <button onClick={async () => { await deleteShopSale(sale.id); await loadAll(); }} className="text-red-400">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "purchases" && (
          <section className="grid lg:grid-cols-[420px,1fr] gap-6">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-3">
              <h2 className="text-lg font-bold">{editingPurchaseId ? "Edit purchase" : "Add purchase"}</h2>
              <input placeholder="Item name" value={purchaseForm.item_name} onChange={(e) => setPurchaseForm({ ...purchaseForm, item_name: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              <input type="number" min={1} placeholder="Quantity" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: Number(e.target.value) })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              <input type="number" min={0} step="0.01" placeholder="Unit cost USD" value={purchaseForm.unit_cost_usd} onChange={(e) => setPurchaseForm({ ...purchaseForm, unit_cost_usd: Number(e.target.value) })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              <input type="number" min={0} step="0.01" placeholder="Transport USD" value={purchaseForm.transport_cost_usd} onChange={(e) => setPurchaseForm({ ...purchaseForm, transport_cost_usd: Number(e.target.value) })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              <input type="number" min={0} step="0.01" placeholder="Commission USD" value={purchaseForm.commission_cost_usd} onChange={(e) => setPurchaseForm({ ...purchaseForm, commission_cost_usd: Number(e.target.value) })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              <input placeholder="Supplier" value={purchaseForm.supplier} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2" />
              <select value={purchaseForm.status} onChange={(e) => setPurchaseForm({ ...purchaseForm, status: e.target.value as "paid" | "in_transit" | "completed" })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2">
                <option value="paid">paid</option>
                <option value="in_transit">in_transit</option>
                <option value="completed">completed</option>
              </select>
              <textarea placeholder="Notes" value={purchaseForm.notes} onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 min-h-[96px]" />
              <div className="text-sm text-gray-400">Total goods: {money(purchaseForm.total_cost_usd)}</div>
              <div className="flex gap-2">
                <button onClick={submitPurchase} className="px-4 py-2 rounded-lg bg-yellow-500 text-gray-950 font-bold">Save</button>
                {editingPurchaseId && <button onClick={() => { setEditingPurchaseId(null); setPurchaseForm(emptyPurchase); }} className="px-4 py-2 rounded-lg border border-gray-700">Cancel</button>}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-400 border-b border-gray-800"><tr><th className="p-3">Item</th><th>Qty</th><th>Unit</th><th>Total</th><th>Transport</th><th>Commission</th><th>Status</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="border-b border-gray-800/70">
                      <td className="p-3">{purchase.item_name}</td><td>{purchase.quantity}</td><td>{money(purchase.unit_cost_usd)}</td><td>{money(purchase.total_cost_usd)}</td><td>{money(purchase.transport_cost_usd)}</td><td>{money(purchase.commission_cost_usd)}</td><td>{purchase.status}</td><td>{date(purchase.created_at)}</td>
                      <td className="pr-3 text-right space-x-2">
                        <button onClick={() => { setEditingPurchaseId(purchase.id); setPurchaseForm({ item_name: purchase.item_name, quantity: purchase.quantity, unit_cost_usd: purchase.unit_cost_usd, total_cost_usd: purchase.total_cost_usd, transport_cost_usd: purchase.transport_cost_usd, commission_cost_usd: purchase.commission_cost_usd, supplier: purchase.supplier ?? "", status: purchase.status, notes: purchase.notes ?? "" }); }} className="text-yellow-400">Edit</button>
                        <button onClick={async () => { await deleteShopPurchase(purchase.id); await loadAll(); }} className="text-red-400">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "inventory" && (
          <section className="rounded-2xl border border-gray-800 bg-gray-900 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-400 border-b border-gray-800"><tr><th className="p-3">Item</th><th>Quantity</th><th>Total cost</th><th>Avg cost</th><th>Updated</th></tr></thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id} className="border-b border-gray-800/70">
                    <td className="p-3">{item.item_name}</td>
                    <td>{item.quantity}</td>
                    <td>{money(item.total_cost_usd)}</td>
                    <td>{money(item.avg_cost_usd)}</td>
                    <td>{date(item.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}
