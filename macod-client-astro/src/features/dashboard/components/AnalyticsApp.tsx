/**
 * Analytics App — CPD dashboard with delivery rate, revenue, CAPI status.
 *
 * Fetches from:
 *   /api/analytics/cpd          — overall metrics
 *   /api/analytics/by-product   — delivery rate per product
 *   /api/analytics/capi-status   — CAPI events fired vs pending
 */

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface CpdData {
  totalOrders: number;
  delivered: number;
  returned: number;
  cancelled: number;
  pending: number;
  deliveryRate: number;
  revenueCollected: number;
  returnsValue: number;
  currency: string;
}

interface ProductRow {
  productName: string;
  totalOrders: number;
  delivered: number;
  returned: number;
  revenue: number;
}

interface CapiStatusRow {
  status: string;
  count: number;
}

export default function AnalyticsApp() {
  const [cpd, setCpd] = useState<CpdData | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [capiStatus, setCapiStatus] = useState<CapiStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const from = new Date(Date.now() - range * 86400000).toISOString().slice(0, 10);
      const to = new Date().toISOString().slice(0, 10);
      try {
        const [cpdData, prodData, capiData] = await Promise.all([
          apiFetch<CpdData>(`/api/analytics/cpd?from=${from}&to=${to}`),
          apiFetch<{ data: ProductRow[] }>(`/api/analytics/by-product?from=${from}&to=${to}`),
          apiFetch<{ data: CapiStatusRow[] }>(`/api/analytics/capi-status?from=${from}&to=${to}`),
        ]);
        if (cancelled) return;
        setCpd(cpdData);
        setProducts(prodData.data ?? []);
        setCapiStatus(capiData.data ?? []);
      } catch (err) {
        console.error("Analytics fetch failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black">Analytics & CPD</h1>
        <select value={range} onChange={(e) => setRange(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {cpd && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Orders" value={cpd.totalOrders} color="blue" />
          <StatCard label="Delivered" value={cpd.delivered} color="green" />
          <StatCard label="Delivery Rate" value={`${cpd.deliveryRate}%`} color="purple" />
          <StatCard label="Returned" value={cpd.returned} color="red" />
          <StatCard label="Revenue" value={`${cpd.revenueCollected} ${cpd.currency}`} color="green" />
          <StatCard label="Returns Value" value={`${cpd.returnsValue} ${cpd.currency}`} color="red" />
          <StatCard label="Pending" value={cpd.pending} color="yellow" />
          <StatCard label="Cancelled" value={cpd.cancelled} color="gray" />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-xl p-4">
          <h2 className="font-black mb-3">By Product</h2>
          {products.length === 0 ? (
            <p className="text-gray-400 text-sm">No data</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1">Product</th>
                  <th className="py-1 text-center">Orders</th>
                  <th className="py-1 text-center">Delivered</th>
                  <th className="py-1 text-center">Rate</th>
                  <th className="py-1 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-1">{p.productName}</td>
                    <td className="text-center">{p.totalOrders}</td>
                    <td className="text-center">{p.delivered}</td>
                    <td className="text-center">{p.totalOrders > 0 ? Math.round(p.delivered / p.totalOrders * 100) : 0}%</td>
                    <td className="text-right">{p.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border rounded-xl p-4">
          <h2 className="font-black mb-3">CAPI Status</h2>
          {capiStatus.length === 0 ? (
            <p className="text-gray-400 text-sm">No CAPI events</p>
          ) : (
            <div className="space-y-2">
              {capiStatus.map((row, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{row.status}</span>
                  <span className="font-bold">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    purple: "bg-purple-50 text-purple-700",
    yellow: "bg-yellow-50 text-yellow-700",
    gray: "bg-gray-50 text-gray-700",
  };
  return (
    <div className={`rounded-xl p-3 ${colors[color]}`}>
      <div className="text-xs font-bold opacity-70">{label}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
    </div>
  );
}
