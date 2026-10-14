/**
 * Call Center App — order confirmation queue with WhatsApp 1-click.
 *
 * Filters: pending, confirmed, unreachable_1/2/3, fake_number, cancelled.
 * Each order row has:
 *   - 1-click WhatsApp button (pre-filled Darija message)
 *   - Call status dropdown
 *   - Call notes input
 * Bulk confirm/cancel.
 */

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  city: string | null;
  address: string | null;
  price: number;
  deliveryFee: number;
  status: string;
  callStatus: string | null;
  callNotes: string | null;
  createdAt: string;
}

type CallStatus = "pending" | "confirmed" | "unreachable_1" | "unreachable_2" | "unreachable_3" | "fake_number" | "cancelled";

const STATUS_LABELS: Record<CallStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  unreachable_1: "Injoignable 1",
  unreachable_2: "Injoignable 2",
  unreachable_3: "Injoignable 3",
  fake_number: "Faux Numéro",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<CallStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  unreachable_1: "bg-orange-100 text-orange-700",
  unreachable_2: "bg-orange-100 text-orange-700",
  unreachable_3: "bg-red-100 text-red-700",
  fake_number: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-700",
};

export default function CallCenterApp() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<CallStatus | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter !== "all" ? `?status=${filter}` : "";
      const res = await apiFetch<{ data: Order[]; count: number }>(`/api/orders/call-center${qs}`);
      setOrders(res.data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateCallStatus = async (orderId: string, callStatus: CallStatus, notes?: string) => {
    try {
      await apiFetch(`/api/orders/${orderId}/call-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callStatus, callNotes: notes }),
      });
      fetchOrders();
    } catch (err) {
      console.error("Failed to update call status:", err);
    }
  };

  const openWhatsApp = async (orderId: string) => {
    try {
      const res = await apiFetch<{ whatsappUrl: string }>(`/api/orders/${orderId}/whatsapp`, { method: "POST" });
      window.open(res.whatsappUrl, "_blank");
    } catch (err) {
      console.error("Failed to get WhatsApp URL:", err);
    }
  };

  const bulkConfirm = async () => {
    if (selected.size === 0) return;
    try {
      await apiFetch(`/api/orders/bulk-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: [...selected] }),
      });
      setSelected(new Set());
      fetchOrders();
    } catch (err) {
      console.error("Bulk confirm failed:", err);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black">Call Center</h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={bulkConfirm} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold">
              Confirm {selected.size}
            </button>
          )}
          <button onClick={fetchOrders} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-bold">
            Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(["all", "pending", "confirmed", "unreachable_1", "unreachable_2", "unreachable_3", "fake_number", "cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${filter === s ? "bg-purple-600 text-white" : "bg-gray-100"}`}
          >
            {s === "all" ? "All" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No orders</div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const total = order.price + order.deliveryFee;
            return (
              <div key={order.id} className="border rounded-xl p-3 bg-white">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(order.id)}
                    onChange={() => toggleSelect(order.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black">{order.orderNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${order.callStatus ? STATUS_COLORS[order.callStatus as CallStatus] : "bg-gray-100"}`}>
                        {order.callStatus ? STATUS_LABELS[order.callStatus as CallStatus] : "New"}
                      </span>
                    </div>
                    <div className="text-sm mt-1">
                      <span className="font-bold">{order.customerName}</span>
                      <span className="text-gray-500 ms-2">{order.phone}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {order.city} · {order.address}
                    </div>
                    <div className="text-sm font-bold mt-1">{total} درهم</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => openWhatsApp(order.id)}
                      className="text-xs px-2 py-1 bg-green-500 text-white rounded font-bold"
                    >
                      WhatsApp
                    </button>
                    <select
                      value={order.callStatus ?? "pending"}
                      onChange={(e) => updateCallStatus(order.id, e.target.value as CallStatus)}
                      className="text-xs border rounded px-1 py-1"
                    >
                      {(Object.keys(STATUS_LABELS) as CallStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
